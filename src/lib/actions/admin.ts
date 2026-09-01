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
