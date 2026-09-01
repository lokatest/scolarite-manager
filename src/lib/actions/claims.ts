"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createClaim(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const files = formData.getAll("files") as File[];

  if (!title) return { error: "Merci de renseigner un titre." };

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
  if (profile?.role !== "user") {
    return { error: "Seuls les gestionnaires peuvent créer une réclamation." };
  }

  const { data: inserted, error } = await supabase
    .from("claims")
    .insert({
      title,
      description: description || null,
      status: "en_attente",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) return { error: "Erreur : " + (error?.message || "création impossible") };

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (!file.type.startsWith("image/")) continue;
    if (file.size > 8 * 1024 * 1024) continue;

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${inserted.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("claim-photos")
      .upload(path, file, { contentType: file.type });

    if (!uploadError) {
      await supabase.from("claim_photos").insert({
        claim_id: inserted.id,
        storage_path: path,
        file_name: file.name,
        uploaded_by: user.id,
      });
    }
  }

  revalidatePath("/dashboard/claims");
  return { success: true };
}

export async function updateClaim(claimId: string, formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!title) return { error: "Merci de renseigner un titre." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };

  const { data: existing } = await supabase
    .from("claims")
    .select("status")
    .eq("id", claimId)
    .single();

  if (existing?.status !== "en_attente") {
    return { error: "Seule une réclamation en attente peut être modifiée." };
  }

  const { error } = await supabase
    .from("claims")
    .update({ title, description: description || null })
    .eq("id", claimId);

  if (error) return { error: "Erreur : " + error.message };

  revalidatePath("/dashboard/claims");
  return { success: true };
}

export async function updateClaimStatus(claimId: string, newStatus: "validee" | "rejetee") {
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
    return { error: "Seul un administrateur peut valider ou rejeter une réclamation." };
  }

  const { error } = await supabase
    .from("claims")
    .update({
      status: newStatus,
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  if (error) return { error: "Erreur : " + error.message };

  revalidatePath("/dashboard/claims");
  return { success: true };
}

export async function deleteClaim(claimId: string) {
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

  const { data: existing } = await supabase
    .from("claims")
    .select("status")
    .eq("id", claimId)
    .single();

  if (!existing) return { error: "Cette réclamation n'existe plus." };

  if (existing.status !== "en_attente" && profile?.role !== "admin") {
    return { error: "Seul un administrateur peut supprimer une réclamation déjà traitée." };
  }

  const { data: photos } = await supabase
    .from("claim_photos")
    .select("storage_path")
    .eq("claim_id", claimId);

  const { error } = await supabase.from("claims").delete().eq("id", claimId);
  if (error) return { error: "Erreur : " + error.message };

  const paths = (photos || []).map((p) => p.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("claim-photos").remove(paths);
  }

  revalidatePath("/dashboard/claims");
  return { success: true };
}

export async function getSignedClaimPhotoUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("claim-photos")
    .createSignedUrl(storagePath, 60 * 10);

  if (error || !data) return { error: "Impossible de charger l'image." };
  return { url: data.signedUrl };
}
