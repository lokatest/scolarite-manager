import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import { notFound } from "next/navigation";
import Link from "next/link";
import PaymentRequestForm from "@/components/PaymentRequestForm";
import RequestValidationActions from "@/components/RequestValidationActions";
import PaymentProofViewer from "@/components/PaymentProofViewer";
import StatusPill from "@/components/StatusPill";
import type { PaymentProof, PaymentRequest, Profile, Student } from "@/lib/types";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) notFound();

  const { data: requests } = await supabase
    .from("payment_requests")
    .select(
      "*, requested_by_profile:profiles!payment_requests_requested_by_fkey(*), validated_by_profile:profiles!payment_requests_validated_by_fkey(*), terminee_by_profile:profiles!payment_requests_terminee_by_fkey(*)"
    )
    .eq("student_id", id)
    .order("requested_at", { ascending: false });

  const typedStudent = student as Student;
  const typedRequests = (requests || []) as (PaymentRequest & {
    requested_by_profile: Profile | null;
    validated_by_profile: Profile | null;
    terminee_by_profile: Profile | null;
  })[];

  // Récupère les preuves de paiement pour toutes les demandes de cet étudiant
  const requestIds = typedRequests.map((r) => r.id);
  let proofsByRequest: Record<string, PaymentProof[]> = {};
  if (requestIds.length > 0) {
    const { data: proofs } = await supabase
      .from("payment_proofs")
      .select("*")
      .in("payment_request_id", requestIds)
      .order("uploaded_at", { ascending: false });

    proofsByRequest = (proofs || []).reduce((acc: Record<string, PaymentProof[]>, p) => {
      const arr = acc[p.payment_request_id] || [];
      arr.push(p as PaymentProof);
      acc[p.payment_request_id] = arr;
      return acc;
    }, {});
  }

  return (
    <div>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--tts-border)] bg-white">
        <Link
          href="/dashboard/students"
          className="text-sm text-[var(--tts-blue)] hover:underline mb-4 inline-block"
        >
          ← Retour aux étudiants
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold font-display text-lg shrink-0"
              style={{ background: "linear-gradient(135deg, var(--tts-dark), var(--tts-blue))" }}
            >
              {typedStudent.full_name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-[var(--tts-dark)]">
                {typedStudent.full_name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="font-mono text-xs px-2 py-1 rounded-md bg-[var(--tts-bg)] text-[var(--tts-text-muted)] border border-[var(--tts-border)]">
                  {typedStudent.matricule}
                </span>
                <span className="text-xs px-2 py-1 rounded-md bg-[var(--tts-blue)]/10 text-[var(--tts-blue)] font-medium">
                  {typedStudent.filiere}
                </span>
                <span className="text-xs px-2 py-1 rounded-md bg-[var(--tts-orange)]/10 text-[var(--tts-orange)] font-medium">
                  {typedStudent.niveau}
                </span>
                {profile.role === "admin" && (
                  <span className="text-xs px-2 py-1 rounded-md bg-[var(--tts-bg)] text-[var(--tts-text-muted)] border border-[var(--tts-border)]">
                    Ajouté le {formatDateTime(typedStudent.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-3xl space-y-6">
        <PaymentRequestForm studentId={typedStudent.id} />

        <div>
          <h2 className="font-display font-semibold text-[var(--tts-dark)] mb-4">
            Historique des demandes de paiement
          </h2>

          {typedRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-10 text-center text-sm text-[var(--tts-text-muted)]">
              Aucune demande de paiement pour cet étudiant.
            </div>
          ) : (
            <ul className="space-y-3">
              {typedRequests.map((r) => (
                <li
                  key={r.id}
                  className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold font-display text-[var(--tts-dark)]">
                        {Number(r.amount).toLocaleString("fr-FR")} FCFA
                      </p>
                      {r.motif && (
                        <p className="text-sm text-[var(--tts-text-muted)] mt-0.5">{r.motif}</p>
                      )}
                      {r.recu_ecobank && (
                        <p className="text-xs text-[var(--tts-text-muted)] mt-0.5 font-mono">
                          Reçu ECOBANK : {r.recu_ecobank}
                        </p>
                      )}
                    </div>
                    <StatusPill status={r.status} />
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--tts-border)] space-y-1.5 text-xs text-[var(--tts-text-muted)]">
                    <p>
                      Demandée par{" "}
                      <span className="font-medium text-[var(--tts-dark)]">
                        {r.requested_by_profile?.full_name ?? "—"}
                      </span>{" "}
                      le {formatDateTime(r.requested_at)}
                    </p>
                    {r.validated_at && (
                      <p>
                        {r.status === "rejetee" ? "Rejetée" : "Validée"} par{" "}
                        <span className="font-medium text-[var(--tts-dark)]">
                          {r.validated_by_profile?.full_name ?? "—"}
                        </span>{" "}
                        le {formatDateTime(r.validated_at)}
                      </p>
                    )}
                    {r.terminee_at && (
                      <p>
                        Marquée terminée par{" "}
                        <span className="font-medium text-[var(--tts-dark)]">
                          {r.terminee_by_profile?.full_name ?? "—"}
                        </span>{" "}
                        le {formatDateTime(r.terminee_at)}
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <RequestValidationActions
                      requestId={r.id}
                      studentId={typedStudent.id}
                      status={r.status}
                      role={profile.role}
                      amount={r.amount}
                      motif={r.motif}
                      recuEcobank={r.recu_ecobank}
                      proofPath={proofsByRequest[r.id]?.[0]?.storage_path || null}
                    />
                  </div>

                  <div className="mt-4">
                    <PaymentProofViewer proofs={proofsByRequest[r.id] || []} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
