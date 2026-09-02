import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Récupère les octets du template Word, avec un client Supabase fourni
 * en paramètre. Module utilitaire simple (pas de "use server"), pour
 * pouvoir être appelé aussi bien avec le client de l'utilisateur connecté
 * qu'avec un client à privilèges élevés (tâches planifiées sans session).
 */
export async function getReceiptTemplateBytesWithClient(
  supabase: SupabaseClient
): Promise<Uint8Array | null> {
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
