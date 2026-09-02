"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPaymentRequest(formData: FormData) {
  const student_id = String(formData.get("student_id") || "");
  const amountRaw = String(formData.get("amount") || "");
  const motif = String(formData.get("motif") || "").trim();
  const recu_ecobank = String(formData.get("recu_ecobank") || "").trim();
  const amount = Number(amountRaw);
  const file = formData.get("file") as File | null;

  if (!student_id || !amountRaw || isNaN(amount) || amount <= 0) {
    return { error: "Merci de renseigner un montant valide." };
  }
  if (!motif) {
    return { error: "Merci de sélectionner un motif." };
  }
  if (!recu_ecobank) {
    return { error: "Merci de renseigner le numéro du reçu ECOBANK." };
  }
  if (!file || file.size === 0) {
    return { error: "Merci de joindre une capture de la transaction." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Seules les images sont acceptées (JPG, PNG, WEBP...)." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "L'image est trop volumineuse (8 Mo maximum)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Session expirée, reconnectez-vous." };

  const { data: inserted, error } = await supabase
    .from("payment_requests")
    .insert({
      student_id,
      amount,
      motif,
      recu_ecobank,
      status: "en_attente",
      requested_by: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) return { error: "Erreur : " + (error?.message || "création impossible") };

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${inserted.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    // On annule la demande si l'image n'a pas pu être envoyée
    await supabase.from("payment_requests").delete().eq("id", inserted.id);
    return { error: "Erreur d'envoi de l'image : " + uploadError.message };
  }

  const { error: proofError } = await supabase.from("payment_proofs").insert({
    payment_request_id: inserted.id,
    storage_path: path,
    file_name: file.name,
    uploaded_by: user.id,
  });

  if (proofError) {
    await supabase.from("payment_requests").delete().eq("id", inserted.id);
    return { error: "Erreur : " + proofError.message };
  }

  revalidatePath(`/dashboard/students/${student_id}`);
  revalidatePath("/dashboard/requests");
  return { success: true };
}

export async function updatePaymentRequestStatus(
  requestId: string,
  studentId: string,
  newStatus: "validee" | "rejetee"
) {
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
    return { error: "Seul un administrateur peut valider ou rejeter une demande." };
  }

  const validatedAt = new Date();

  const { error } = await supabase
    .from("payment_requests")
    .update({
      status: newStatus,
      validated_by: user.id,
      validated_at: validatedAt.toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: "Erreur : " + error.message };

  // La génération du reçu (appel à iLoveAPI) est différée APRÈS l'envoi
  // de cette réponse, via `after()` : l'admin n'attend pas ce traitement,
  // ce qui rend la validation instantanée. Un système de nouvelle tentative
  // automatique (immédiate + différée via tâche planifiée) prend le relais
  // en cas d'échec, sans jamais bloquer l'utilisateur.
  if (newStatus === "validee") {
    const { after } = await import("next/server");
    after(async () => {
      const { attemptReceiptGeneration } = await import(
        "@/lib/receipt/attemptReceiptGeneration"
      );
      const bgSupabase = await createClient();
      const first = await attemptReceiptGeneration(bgSupabase, requestId);
      if (!first.success) {
        // Une seule nouvelle tentative immédiate (couvre les pannes très
        // courtes) ; au-delà, la tâche planifiée /api/retry-receipts prend
        // le relais en arrière-plan, sans solliciter l'utilisateur.
        await new Promise((r) => setTimeout(r, 4000));
        await attemptReceiptGeneration(bgSupabase, requestId);
      }
    });
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/requests");
  return { success: true };
}

/**
 * Marque une demande "validee" comme "terminee".
 * Réservé aux gestionnaires (role = "user"), pas aux admins.
 */
export async function markPaymentRequestAsTerminee(requestId: string, studentId: string) {
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
    return { error: "Seuls les gestionnaires peuvent marquer une demande comme terminée." };
  }

  const { data: existing } = await supabase
    .from("payment_requests")
    .select("status")
    .eq("id", requestId)
    .single();

  if (existing?.status !== "validee") {
    return { error: "Seule une demande déjà validée peut être marquée comme terminée." };
  }

  const { error } = await supabase
    .from("payment_requests")
    .update({
      status: "terminee",
      terminee_by: user.id,
      terminee_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: "Erreur : " + error.message };

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/requests");
  return { success: true };
}

/**
 * Modifie le montant / motif d'une demande.
 * Autorisé à tout utilisateur actif tant que la demande est "en_attente".
 */
export async function updatePaymentRequestDetails(
  requestId: string,
  studentId: string,
  formData: FormData
) {
  const amountRaw = String(formData.get("amount") || "");
  const motif = String(formData.get("motif") || "").trim();
  const recu_ecobank = String(formData.get("recu_ecobank") || "").trim();
  const amount = Number(amountRaw);
  const file = formData.get("file") as File | null;

  if (!amountRaw || isNaN(amount) || amount <= 0) {
    return { error: "Merci de renseigner un montant valide." };
  }
  if (!motif) {
    return { error: "Merci de sélectionner un motif." };
  }
  if (!recu_ecobank) {
    return { error: "Merci de renseigner le numéro du reçu ECOBANK." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };

  const { data: existing } = await supabase
    .from("payment_requests")
    .select("status")
    .eq("id", requestId)
    .single();

  if (existing?.status !== "en_attente") {
    return { error: "Seule une demande en attente peut être modifiée." };
  }

  // Si une nouvelle capture est fournie, on remplace l'ancienne (une seule
  // preuve de paiement autorisée par demande, comme à la création).
  if (file && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { error: "Seules les images sont acceptées (JPG, PNG, WEBP...)." };
    }
    if (file.size > 8 * 1024 * 1024) {
      return { error: "L'image est trop volumineuse (8 Mo maximum)." };
    }

    const { data: oldProofs } = await supabase
      .from("payment_proofs")
      .select("id, storage_path")
      .eq("payment_request_id", requestId);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${requestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(path, file, { contentType: file.type });

    if (uploadError) return { error: "Erreur d'envoi de l'image : " + uploadError.message };

    const { error: proofError } = await supabase.from("payment_proofs").insert({
      payment_request_id: requestId,
      storage_path: path,
      file_name: file.name,
      uploaded_by: user.id,
    });

    if (proofError) return { error: "Erreur : " + proofError.message };

    // Nettoyage des anciennes preuves (base + stockage)
    if (oldProofs && oldProofs.length > 0) {
      const oldPaths = oldProofs.map((p) => p.storage_path).filter(Boolean);
      const oldIds = oldProofs.map((p) => p.id);
      await supabase.from("payment_proofs").delete().in("id", oldIds);
      if (oldPaths.length > 0) {
        await supabase.storage.from("payment-proofs").remove(oldPaths);
      }
    }
  }

  const { error } = await supabase
    .from("payment_requests")
    .update({ amount, motif, recu_ecobank })
    .eq("id", requestId);

  if (error) return { error: "Erreur : " + error.message };

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/requests");
  return { success: true };
}

/**
 * Supprime une demande de paiement.
 * - "en_attente" -> tout utilisateur actif
 * - "validee" / "terminee" / "rejetee" -> administrateur uniquement
 * (Ces règles sont aussi imposées par les policies RLS en base.)
 */
export async function deletePaymentRequest(requestId: string, studentId: string) {
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
    .from("payment_requests")
    .select("status, receipt_path")
    .eq("id", requestId)
    .single();

  if (!existing) return { error: "Cette demande n'existe plus." };

  if (existing.status !== "en_attente" && profile?.role !== "admin") {
    return {
      error: "Seul un administrateur peut supprimer une demande déjà traitée.",
    };
  }

  // Récupère les preuves de paiement associées AVANT de supprimer la demande,
  // pour pouvoir ensuite nettoyer les fichiers réels dans le stockage.
  const { data: proofs } = await supabase
    .from("payment_proofs")
    .select("storage_path")
    .eq("payment_request_id", requestId);

  const { error } = await supabase.from("payment_requests").delete().eq("id", requestId);

  if (error) return { error: "Erreur : " + error.message };

  // Nettoyage des fichiers de stockage associés (capture(s) de paiement + reçu PDF).
  // La ligne "payment_requests" étant déjà supprimée avec succès à ce stade,
  // l'autorisation de suppression a déjà été validée ; on peut nettoyer
  // sereinement les fichiers qui n'ont plus aucune raison d'exister.
  const proofPaths = (proofs || []).map((p) => p.storage_path).filter(Boolean);
  if (proofPaths.length > 0) {
    await supabase.storage.from("payment-proofs").remove(proofPaths);
  }
  if (existing.receipt_path) {
    await supabase.storage.from("receipts").remove([existing.receipt_path]);
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/requests");
  return { success: true };
}

/**
 * Recherche des demandes de paiement par nom d'étudiant ou matricule.
 */
export async function searchPaymentRequests(query: string) {
  const supabase = await createClient();
  const trimmed = query.trim();

  if (!trimmed) {
    const { data, error } = await supabase
      .from("payment_requests")
      .select(
        "*, student:students(*), requested_by_profile:profiles!payment_requests_requested_by_fkey(*), payment_proofs(storage_path)"
      )
      .order("requested_at", { ascending: false });
    if (error) return { error: error.message, data: [] };
    return { data: data || [] };
  }

  // On cherche d'abord les étudiants correspondants, puis leurs demandes.
  const { data: matchingStudents } = await supabase
    .from("students")
    .select("id")
    .or(`matricule.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`);

  const ids = (matchingStudents || []).map((s) => s.id);
  if (ids.length === 0) return { data: [] };

  const { data, error } = await supabase
    .from("payment_requests")
    .select(
      "*, student:students(*), requested_by_profile:profiles!payment_requests_requested_by_fkey(*), payment_proofs(storage_path)"
    )
    .in("student_id", ids)
    .order("requested_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

/**
 * Upload d'une preuve de paiement (image) liée à une demande.
 */
export async function uploadPaymentProof(requestId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Merci de sélectionner un fichier." };

  if (!file.type.startsWith("image/")) {
    return { error: "Seules les images sont acceptées (JPG, PNG, WEBP...)." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "L'image est trop volumineuse (8 Mo maximum)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnectez-vous." };

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${requestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type });

  if (uploadError) return { error: "Erreur d'envoi : " + uploadError.message };

  const { error: insertError } = await supabase.from("payment_proofs").insert({
    payment_request_id: requestId,
    storage_path: path,
    file_name: file.name,
    uploaded_by: user.id,
  });

  if (insertError) return { error: "Erreur : " + insertError.message };

  revalidatePath(`/dashboard/students`);
  return { success: true };
}

/**
 * Génère une URL signée temporaire pour afficher une preuve de paiement.
 */
export async function getSignedProofUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(storagePath, 60 * 10);

  if (error || !data) return { error: "Impossible de charger l'image." };
  return { url: data.signedUrl };
}

/**
 * Retourne une URL signée pour télécharger le reçu d'une demande.
 * Le reçu n'est accessible que si la demande est "terminee".
 */
export async function getReceiptDownloadUrl(requestId: string) {
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

  const { data: request } = await supabase
    .from("payment_requests")
    .select("status, receipt_path")
    .eq("id", requestId)
    .single();

  if (!request) return { error: "Demande introuvable." };

  // L'admin peut consulter le reçu dès la validation, pour vérification,
  // sans attendre que le gestionnaire marque la demande "terminée". Les
  // gestionnaires, eux, doivent toujours attendre ce statut.
  const isAllowed =
    request.status === "terminee" ||
    (request.status === "validee" && profile?.role === "admin");

  if (!isAllowed) {
    return { error: "Le reçu n'est disponible qu'une fois la demande marquée terminée." };
  }
  if (!request.receipt_path) {
    return { error: "Aucun reçu n'a été généré pour cette demande." };
  }

  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(request.receipt_path, 60 * 5);

  if (error || !data) return { error: "Impossible de charger le reçu." };
  return { url: data.signedUrl };
}

/**
 * Régénère manuellement le reçu d'une demande (ex: la génération automatique
 * a échoué à la validation). Affiche l'erreur exacte pour pouvoir diagnostiquer
 * un souci de configuration (ex: Adobe PDF Services).
 */
export async function regenerateReceipt(requestId: string, studentId: string) {
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
    return { error: "Seul un administrateur peut régénérer un reçu." };
  }

  const { data: requestRow } = await supabase
    .from("payment_requests")
    .select("validated_at")
    .eq("id", requestId)
    .single();

  if (!requestRow) return { error: "Demande introuvable." };
  if (!requestRow.validated_at) {
    return { error: "Cette demande n'a pas encore été validée." };
  }

  // Action manuelle explicite : on réinitialise le compteur de tentatives
  // pour permettre à l'admin de relancer même après un échec définitif.
  await supabase
    .from("payment_requests")
    .update({ receipt_attempts: 0, receipt_status: "none" })
    .eq("id", requestId);

  const { attemptReceiptGeneration } = await import(
    "@/lib/receipt/attemptReceiptGeneration"
  );
  const result = await attemptReceiptGeneration(supabase, requestId);

  if (!result.success) {
    return { error: result.error || "Échec de la génération du reçu." };
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/requests");
  return { success: true };
}
