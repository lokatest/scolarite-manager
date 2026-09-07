"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, supabase, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { ok: profile?.role === "admin", supabase, user };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const { ok, supabase, user } = await assertAdmin();
  if (!ok) return { error: "Action réservée aux administrateurs." };

  const { data: targetRow } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: error.message };

  const { logActivity } = await import("@/lib/activityLog");
  await logActivity({
    userId: user!.id,
    userEmail: user!.email ?? null,
    eventType: "action",
    detail: `${isActive ? "Activation" : "Désactivation"} du compte de ${targetRow?.full_name ?? userId}`,
  });

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function setUserRole(userId: string, role: "admin" | "user") {
  const { ok, supabase, user } = await assertAdmin();
  if (!ok) return { error: "Action réservée aux administrateurs." };

  const { data: targetRow } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };

  const { logActivity } = await import("@/lib/activityLog");
  await logActivity({
    userId: user!.id,
    userEmail: user!.email ?? null,
    eventType: "action",
    detail: `Changement de rôle de ${targetRow?.full_name ?? userId} → ${role === "admin" ? "Administrateur" : "Gestionnaire"}`,
  });

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function updateUserPhone(userId: string, phoneNumber: string) {
  const { ok, supabase, user } = await assertAdmin();
  if (!ok) return { error: "Action réservée aux administrateurs." };

  const trimmed = phoneNumber.replace(/\s+/g, "");
  if (trimmed && !/^\+[1-9]\d{6,14}$/.test(trimmed)) {
    return {
      error:
        "Le numéro doit être au format international, ex : +237650000000.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ phone_number: trimmed || null })
    .eq("id", userId);

  if (error) return { error: error.message };

  const { logActivity } = await import("@/lib/activityLog");
  await logActivity({
    userId: user!.id,
    userEmail: user!.email ?? null,
    eventType: "action",
    detail: `Modification du numéro de téléphone d'un utilisateur`,
  });

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

/**
 * Lève un blocage de connexion (suite à 5 tentatives échouées) pour
 * l'email donné, en supprimant sa ligne dans login_attempts. Réservé
 * aux administrateurs.
 */
export async function unlockLoginAttempts(email: string) {
  const { ok, user } = await assertAdmin();
  if (!ok) return { error: "Action réservée aux administrateurs." };

  const { createClient: createServiceClient } = await import("@supabase/supabase-js");
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await serviceClient
    .from("login_attempts")
    .delete()
    .eq("email", email.trim().toLowerCase());

  if (error) return { error: error.message };

  const { logActivity } = await import("@/lib/activityLog");
  await logActivity({
    userId: user!.id,
    userEmail: user!.email ?? null,
    eventType: "action",
    detail: `Déblocage manuel de la connexion pour ${email}`,
  });

  return { success: true };
}
