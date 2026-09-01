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
  const { data: row } = await supabase
    .from("receipt_templates")
    .select("docx_path")
    .eq("id", "default")
    .maybeSingle();

  if (!row?.docx_path) return null;

  const { data, error } = await supabase.storage
    .from("receipt-templates")
    .download(row.docx_path);

  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
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
  const { generateReceiptPdf } = await import("@/lib/receipt/generateReceiptPdf");

  const bytes = await getReceiptTemplateBytes();
  if (!bytes) return { error: "Aucun template n'a encore été chargé." };

  try {
    const { bytes: pdfBytes } = await generateReceiptPdf({
      templateBytes: bytes,
      studentFullName: "JEAN DUPONT MBALLA (EXEMPLE)",
      amount: 125000,
      recuEcobank: "ECB-2026-000123",
      validatedAt: new Date(),
    });

    const base64 = Buffer.from(pdfBytes).toString("base64");
    return { dataUrl: `data:application/pdf;base64,${base64}` };
  } catch (e) {
    return { error: "Erreur de génération : " + (e as Error).message };
  }
}
