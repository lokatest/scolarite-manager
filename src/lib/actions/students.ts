"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createStudent(formData: FormData) {
  const matricule = String(formData.get("matricule") || "").trim().toUpperCase();
  const full_name = String(formData.get("full_name") || "").trim().toUpperCase();
  const filiere = String(formData.get("filiere") || "").trim().toUpperCase();
  const niveau = String(formData.get("niveau") || "").trim();

  if (!matricule || !full_name || !filiere || !niveau) {
    return { error: "Tous les champs sont obligatoires." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("students").insert({
    matricule,
    full_name,
    filiere,
    niveau,
    created_by: user?.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ce matricule existe déjà." };
    }
    return { error: "Erreur lors de la création : " + error.message };
  }

  revalidatePath("/dashboard/students");
  return { success: true };
}

export async function searchStudents(query: string) {
  const supabase = await createClient();
  const trimmed = query.trim();

  let request = supabase
    .from("students")
    .select("*, created_by_profile:profiles!students_created_by_fkey(full_name)")
    .order("full_name", { ascending: true })
    .limit(50);

  if (trimmed) {
    request = request.or(
      `matricule.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`
    );
  }

  const { data, error } = await request;
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

/**
 * Modifie les informations d'un étudiant.
 * - Administrateur : peut tout modifier (nom, matricule, filière, niveau).
 * - Gestionnaire : peut uniquement modifier le matricule et la filière.
 */
export async function updateStudent(studentId: string, formData: FormData) {
  const matricule = String(formData.get("matricule") || "").trim().toUpperCase();
  const filiere = String(formData.get("filiere") || "").trim().toUpperCase();

  if (!matricule || !filiere) {
    return { error: "Le matricule et la filière sont obligatoires." };
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

  if (!profile || (profile.role !== "admin" && profile.role !== "user")) {
    return { error: "Action non autorisée." };
  }

  let updatePayload: Record<string, string> = { matricule, filiere };

  if (profile.role === "admin") {
    const full_name = String(formData.get("full_name") || "").trim().toUpperCase();
    const niveau = String(formData.get("niveau") || "").trim();
    if (!full_name || !niveau) {
      return { error: "Tous les champs sont obligatoires." };
    }
    updatePayload = { matricule, full_name, filiere, niveau };
  }

  const { error } = await supabase.from("students").update(updatePayload).eq("id", studentId);

  if (error) {
    if (error.code === "23505") return { error: "Ce matricule existe déjà." };
    return { error: "Erreur : " + error.message };
  }

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

/**
 * Supprime complètement un étudiant, ainsi que toutes ses demandes de
 * paiement associées (suppression en cascade en base de données) et
 * tous les fichiers de stockage liés (captures de paiement, reçus PDF).
 * Réservé aux administrateurs.
 */
export async function deleteStudent(studentId: string) {
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
    return { error: "Seul un administrateur peut supprimer un étudiant." };
  }

  // Récupère tout ce qui doit être nettoyé dans le stockage AVANT la
  // suppression en base (les demandes de paiement seront supprimées en
  // cascade automatiquement par la base de données).
  const { data: requests } = await supabase
    .from("payment_requests")
    .select("id, receipt_path")
    .eq("student_id", studentId);

  const requestIds = (requests || []).map((r) => r.id);
  let proofPaths: string[] = [];
  if (requestIds.length > 0) {
    const { data: proofs } = await supabase
      .from("payment_proofs")
      .select("storage_path")
      .in("payment_request_id", requestIds);
    proofPaths = (proofs || []).map((p) => p.storage_path).filter(Boolean);
  }
  const receiptPaths = (requests || [])
    .map((r) => r.receipt_path)
    .filter((p): p is string => Boolean(p));

  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) return { error: "Erreur : " + error.message };

  if (proofPaths.length > 0) {
    await supabase.storage.from("payment-proofs").remove(proofPaths);
  }
  if (receiptPaths.length > 0) {
    await supabase.storage.from("receipts").remove(receiptPaths);
  }

  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard/requests");
  return { success: true };
}
