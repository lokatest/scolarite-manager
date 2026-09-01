import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
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
  ]);

  const requests = (recentRequests || []) as (PaymentRequest & { student: Student })[];

  const stats = [
    { label: "Étudiants enregistrés", value: studentsCount ?? 0, color: "var(--tts-dark)" },
    { label: "Demandes en attente", value: pendingCount ?? 0, color: "var(--tts-orange)" },
    { label: "Nombre total de demandes", value: totalRequestsCount ?? 0, color: "var(--tts-blue)" },
    { label: "Demandes terminées", value: termineeCount ?? 0, color: "#059669" },
  ];

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${profile.full_name.split(" ")[0]}`}
        subtitle="Voici un aperçu de l'activité de la plateforme"
      />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-[var(--tts-border)] p-6 shadow-sm"
            >
              <p className="text-sm text-[var(--tts-text-muted)]">{s.label}</p>
              <p className="text-3xl font-bold font-display mt-2" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

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
