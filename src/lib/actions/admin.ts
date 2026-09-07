"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { ok: profile?.role === "admin", supabase };
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const { ok, supabase } = await assertAdmin();
  if (!ok) return { error: "Action réservée aux administrateurs." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function setUserRole(userId: string, role: "admin" | "user") {
  const { ok, supabase } = await assertAdmin();
  if (!ok) return { error: "Action réservée aux administrateurs." };

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function updateUserPhone(userId: string, phoneNumber: string) {
  const { ok, supabase } = await assertAdmin();
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
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

/**
 * Lève un blocage de connexion (suite à 5 tentatives échouées) pour
 * l'email donné, en supprimant sa ligne dans login_attempts. Réservé
 * aux administrateurs.
 */
export async function unlockLoginAttempts(email: string) {
  const { ok } = await assertAdmin();
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
  return { success: true };
}
