import type { SupabaseClient } from "@supabase/supabase-js";
import { isReceiptTemplateKind, type ReceiptTemplateKind } from "./templateKinds";

/**
 * Accès aux modèles Word du reçu, avec un client Supabase fourni en
 * paramètre. Module utilitaire simple (pas de "use server"), pour pouvoir
 * être appelé aussi bien avec le client de l'utilisateur connecté qu'avec
 * un client à privilèges élevés (tâches planifiées sans session).
 */

/** Chemin du fichier Word d'un modèle, ou null s'il n'a jamais été chargé. */
export async function getReceiptTemplatePath(
  supabase: SupabaseClient,
  kind: ReceiptTemplateKind
): Promise<string | null> {
  const { data: row } = await supabase
    .from("receipt_templates")
    .select("docx_path")
    .eq("id", kind)
    .maybeSingle();

  return row?.docx_path ?? null;
}

/** Télécharge les octets d'un modèle depuis le stockage. */
export async function downloadReceiptTemplate(
  supabase: SupabaseClient,
  docxPath: string
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from("receipt-templates").download(docxPath);

  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/** Récupère les octets d'un modèle (Université par défaut). */
export async function getReceiptTemplateBytesWithClient(
  supabase: SupabaseClient,
  kind: ReceiptTemplateKind = "default"
): Promise<Uint8Array | null> {
  const docxPath = await getReceiptTemplatePath(supabase, kind);
  if (!docxPath) return null;
  return downloadReceiptTemplate(supabase, docxPath);
}

/** Modèles effectivement chargés (ceux qui ont un fichier Word enregistré). */
export async function getAvailableTemplateKinds(
  supabase: SupabaseClient
): Promise<Set<ReceiptTemplateKind>> {
  const { data } = await supabase.from("receipt_templates").select("id, docx_path");

  const kinds = new Set<ReceiptTemplateKind>();
  for (const row of (data ?? []) as { id: unknown; docx_path: unknown }[]) {
    if (row.docx_path && isReceiptTemplateKind(row.id)) kinds.add(row.id);
  }
  return kinds;
}
