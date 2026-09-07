import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import DashboardStats from "@/components/DashboardStats";
import Link from "next/link";
import type { PaymentRequest, Student } from "@/lib/types";

export default async function DashboardOverview() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [
    { count: studentsCount },
    { count: pendingCount },
    { count: totalRequestsCount },
    { count: termineeCount },
    { data: recentRequests },
    { data: pendingRequests },
    { data: termineeRequests },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase
      .from("payment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "en_attente"),
    supabase.from("payment_requests").select("*", { count: "exact", head: true }),
    supabase
      .from("payment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "terminee"),
    supabase
      .from("payment_requests")
      .select("*, student:students(*)")
      .order("requested_at", { ascending: false })
      .limit(6),
    supabase
      .from("payment_requests")
      .select("*, student:students(*)")
      .eq("status", "en_attente")
      .order("requested_at", { ascending: false })
      .limit(50),
    supabase
      .from("payment_requests")
      .select("*, student:students(*)")
      .eq("status", "terminee")
      .order("terminee_at", { ascending: false })
      .limit(50),
  ]);

  const requests = (recentRequests || []) as (PaymentRequest & { student: Student })[];
  const pendingList = (pendingRequests || []) as (PaymentRequest & { student: Student })[];
  const termineeList = (termineeRequests || []) as (PaymentRequest & { student: Student })[];

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${profile.full_name.split(" ")[0]}`}
        subtitle="Voici un aperçu de l'activité de la plateforme"
      />
      <div className="p-4 sm:p-8 space-y-8">
        <DashboardStats
          studentsCount={studentsCount ?? 0}
          pendingCount={pendingCount ?? 0}
          totalRequestsCount={totalRequestsCount ?? 0}
          termineeCount={termineeCount ?? 0}
          pendingList={pendingList}
          termineeList={termineeList}
        />

        <div className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--tts-border)]">
            <h2 className="font-display font-semibold text-[var(--tts-dark)]">
              Dernières demandes de paiement
            </h2>
            <Link
              href="/dashboard/requests"
              className="text-sm font-medium text-[var(--tts-blue)] hover:underline"
            >
              Tout voir →
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--tts-text-muted)]">
              Aucune demande de paiement pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--tts-border)]">
              {requests.map((r) => (
                <li key={r.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/students/${r.student_id}`}
                      className="font-medium text-sm text-[var(--tts-dark)] hover:text-[var(--tts-blue)] truncate block"
                    >
                      {r.student?.full_name ?? "Étudiant supprimé"}
                    </Link>
                    <p className="text-xs text-[var(--tts-text-muted)] mt-0.5">
                      {r.student?.matricule} · {Number(r.amount).toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
