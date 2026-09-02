import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import UserRow from "@/components/UserRow";
import type { Profile } from "@/lib/types";

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const users = (data || []) as Profile[];

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle="Gérez les comptes autorisés à modifier les données de la plateforme"
      />
      <div className="p-4 sm:p-8 max-w-3xl">
        <div className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--tts-border)] bg-[var(--tts-bg)]/60 text-left">
                <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Utilisateur</th>
                <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Rôle</th>
                <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Statut</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--tts-border)]">
              {users.map((u) => (
                <UserRow key={u.id} user={u} isSelf={u.id === profile.id} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--tts-text-muted)] mt-4">
          Un nouveau compte créé via la page d&apos;inscription reste inactif tant qu&apos;un
          administrateur ne l&apos;active pas ici. Seuls les administrateurs peuvent valider ou
          rejeter les demandes de paiement.
        </p>
      </div>
    </div>
  );
}
