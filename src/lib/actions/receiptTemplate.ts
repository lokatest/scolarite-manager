"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getReceiptTemplateInfo() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("receipt_templates")
    .select("original_filename, updated_at")
    .eq("id", "default")
    .maybeSingle();

  return {
    filename: data?.original_filename || null,
    updatedAt: data?.updated_at || null,
  };
}

/**
 * Récupère les octets du template Word actuellement enregistré.
 * Utilisé en interne au moment de générer un reçu.
 */
export async function getReceiptTemplateBytes(): Promise<Uint8Array | null> {
  const supabase = await createClient();
  const { getReceiptTemplateBytesWithClient } = await import(
    "@/lib/receipt/getTemplateBytes"
  );
  return getReceiptTemplateBytesWithClient(supabase);
}

export async function uploadReceiptTemplate(formData: FormData) {
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

  const path = `default-${Date.now()}.docx`;
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
    id: "default",
    docx_path: path,
    original_filename: file.name,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  if (dbError) return { error: "Erreur : " + dbError.message };

  revalidatePath("/dashboard/admin/receipt-template");
  return { success: true };
}

/**
 * Génère un reçu d'exemple à partir du template actuel, avec des données
 * fictives, pour que l'admin puisse vérifier le rendu avant de l'utiliser
 * en production.
 */
export async function generatePreviewReceipt() {
  const bytes = await getReceiptTemplateBytes();
  if (!bytes) return { error: "Aucun template n'a encore été chargé." };

  try {
    const { fillDocxTemplate } = await import("@/lib/receipt/docxTokenReplace");
    const { amountToFrenchWords } = await import("@/lib/receipt/amountToWords");
    const { generateReceiptReference } = await import("@/lib/receipt/generateReference");
    const { convertDocxToPdfViaILoveApi } = await import("@/lib/receipt/iloveApi");

    const reference = generateReceiptReference();
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const mo = String(now.getMonth() + 1).padStart(2, "0");

    const values = {
      "{{DATE}}": `${dd}-${mo}-${now.getFullYear()}`,
      "{{HEURE}}": `${hh}:${mm} ${now.getHours() < 12 ? "AM" : "PM"}`,
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
