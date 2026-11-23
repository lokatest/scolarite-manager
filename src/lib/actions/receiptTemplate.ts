"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  RECEIPT_TEMPLATE_KINDS,
  isReceiptTemplateKind,
  templateKindForNiveau,
  type ReceiptTemplateInfo,
  type ReceiptTemplateKind,
} from "@/lib/receipt/templateKinds";

/**
 * État des deux modèles (Université et Formation) pour la page Template du
 * reçu : fichier chargé, date de mise à jour, et nombre de reçus de demandes
 * validées qui attendent encore leur génération.
 */
export async function getReceiptTemplateInfo(): Promise<
  Record<ReceiptTemplateKind, ReceiptTemplateInfo>
> {
  const supabase = await createClient();

  const [{ data: rows }, { data: waiting }] = await Promise.all([
    supabase.from("receipt_templates").select("id, original_filename, updated_at"),
    supabase
      .from("payment_requests")
      .select("id, student:students(niveau)")
      .in("status", ["validee", "terminee"])
      .in("receipt_status", ["pending", "failed"])
      .lt("receipt_attempts", 3)
      .limit(1000),
  ]);

  const info = {} as Record<ReceiptTemplateKind, ReceiptTemplateInfo>;
  for (const kind of RECEIPT_TEMPLATE_KINDS) {
    const row = (rows ?? []).find((r: { id: unknown }) => r.id === kind);
    info[kind] = {
      filename: row?.original_filename ?? null,
      updatedAt: row?.updated_at ?? null,
      enAttente: 0,
    };
  }

  for (const req of waiting ?? []) {
    const student = req.student as unknown as { niveau: string | null } | null;
    info[templateKindForNiveau(student?.niveau)].enAttente++;
  }

  return info;
}

/**
 * Récupère les octets d'un modèle Word enregistré (Université par défaut).
 */
export async function getReceiptTemplateBytes(
  kind: ReceiptTemplateKind = "default"
): Promise<Uint8Array | null> {
  if (!isReceiptTemplateKind(kind)) return null;
  const supabase = await createClient();
  const { getReceiptTemplateBytesWithClient } = await import(
    "@/lib/receipt/getTemplateBytes"
  );
  return getReceiptTemplateBytesWithClient(supabase, kind);
}

export async function uploadReceiptTemplate(formData: FormData) {
  const kind = formData.get("kind") ?? "default";
  if (!isReceiptTemplateKind(kind)) return { error: "Modèle de reçu inconnu." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Merci de sélectionner un fichier .docx." };
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { error: "Seuls les fichiers .docx sont acceptés." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "Le fichier est trop volumineux (10 Mo maximum)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "Seul un administrateur peut modifier le template du reçu." };
  }

  const path = `${kind}-${Date.now()}.docx`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("receipt-templates")
    .upload(path, arrayBuffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });

  if (uploadError) return { error: "Erreur d'envoi : " + uploadError.message };

  const { error: dbError } = await supabase.from("receipt_templates").upsert({
    id: kind,
    docx_path: path,
    original_filename: file.name,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  if (dbError) return { error: "Erreur : " + dbError.message };

  // Les reçus qui attendaient ce modèle sont générés tout de suite, après
  // l'envoi de la réponse : l'admin n'attend pas, et ces reçus n'ont pas à
  // patienter jusqu'à la relance quotidienne ni à être régénérés à la main.
  const { after } = await import("next/server");
  after(async () => {
    await generateWaitingReceipts(kind);
  });

  revalidatePath("/dashboard/admin/receipt-template");
  return { success: true };
}

/**
 * Génère les reçus de demandes validées qui attendaient un modèle donné
 * (au plus 10 par chargement, les suivants passent par la relance
 * quotidienne). Client à privilèges élevés : une fois la réponse envoyée,
 * la session de l'utilisateur n'est plus garantie fiable dans after().
 * Ne lève jamais d'exception.
 */
async function generateWaitingReceipts(kind: ReceiptTemplateKind) {
  try {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: candidates } = await service
      .from("payment_requests")
      .select("id, student:students(niveau)")
      .in("status", ["validee", "terminee"])
      .in("receipt_status", ["pending", "failed"])
      .lt("receipt_attempts", 3)
      .limit(50);

    const ids = (candidates ?? [])
      .filter((req: { student: unknown }) => {
        const student = req.student as { niveau: string | null } | null;
        return templateKindForNiveau(student?.niveau) === kind;
      })
      .slice(0, 10)
      .map((req: { id: unknown }) => String(req.id));

    if (ids.length === 0) return;

    const { attemptReceiptGeneration } = await import(
      "@/lib/receipt/attemptReceiptGeneration"
    );
    for (const id of ids) {
      await attemptReceiptGeneration(service, id);
    }
  } catch (e) {
    console.error("[Reçus] Génération des reçus en attente impossible :", (e as Error).message);
  }
}

/**
 * Génère un reçu d'exemple à partir d'un modèle, avec des données
 * fictives, pour que l'admin puisse vérifier le rendu avant de l'utiliser
 * en production. Réservé à l'admin : chaque aperçu consomme des crédits
 * iLoveAPI.
 */
export async function generatePreviewReceipt(kind: ReceiptTemplateKind = "default") {
  if (!isReceiptTemplateKind(kind)) return { error: "Modèle de reçu inconnu." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "Seul un administrateur peut générer un aperçu du reçu." };
  }

  const bytes = await getReceiptTemplateBytes(kind);
  if (!bytes) return { error: "Aucun fichier n'a encore été chargé pour ce modèle." };

  try {
    const { fillDocxTemplate } = await import("@/lib/receipt/docxTokenReplace");
    const { amountToFrenchWords } = await import("@/lib/receipt/amountToWords");
    const { generateReceiptReference } = await import("@/lib/receipt/generateReference");
    const { convertDocxToPdfViaILoveApi } = await import("@/lib/receipt/iloveApi");

    const reference = generateReceiptReference();
    const now = new Date();
    const { getDatePartsCM } = await import("@/lib/formatDateTime");
    const { day, month, year, hour24, minute } = getDatePartsCM(now);

    const values = {
      "{{DATE}}": `${day}-${month}-${year}`,
      "{{HEURE}}": `${String(hour24).padStart(2, "0")}:${minute} ${hour24 < 12 ? "AM" : "PM"}`,
      "{{MONTANT_LETTRE}}": amountToFrenchWords(125000),
      "{{MONTANT_CHIFFRE}}": (125000).toLocaleString("en-US"),
      "{{REFERENCE}}": reference,
      "{{NUMERO}}": "1793508",
      "{{NOM_COMPLET}}": "JEAN DUPONT MBALLA (EXEMPLE)",
    };

    const { bytes: filledDocx } = await fillDocxTemplate(bytes, values);
    const pdfBytes = await convertDocxToPdfViaILoveApi(filledDocx);

    const base64 = Buffer.from(pdfBytes).toString("base64");
    return { dataUrl: `data:application/pdf;base64,${base64}` };
  } catch (e) {
    return { error: "Erreur de génération : " + (e as Error).message };
  }
}
