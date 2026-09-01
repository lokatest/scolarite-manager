"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { searchPaymentRequests } from "@/lib/actions/payments";
import StatusPill from "./StatusPill";
import RequestValidationActions from "./RequestValidationActions";
import Spinner from "./Spinner";
import type { PaymentRequest, Profile, Role, Student } from "@/lib/types";

type FullRequest = PaymentRequest & {
  student: Student;
  requested_by_profile: Profile | null;
  payment_proofs?: { storage_path: string }[];
};

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

export default function RequestsExplorer({
  initialRequests,
  role,
}: {
  initialRequests: FullRequest[];
  role: Role;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prevInitial, setPrevInitial] = useState(initialRequests);
  if (initialRequests !== prevInitial) {
    setPrevInitial(initialRequests);
    if (!query) setRequests(initialRequests);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await searchPaymentRequests(query);
        setRequests((res.data as FullRequest[]) || []);
      });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pending = requests.filter((r) => r.status === "en_attente");
  const resolved = requests.filter((r) => r.status !== "en_attente");

  return (
    <div>
      <div className="relative max-w-md mb-8">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--tts-text-muted)]"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une requête par nom ou matricule..."
          className="w-full rounded-lg border border-[var(--tts-border)] pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] focus:border-transparent transition bg-white"
        />
        {isPending && (
          <Spinner
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--tts-blue)]"
          />
        )}
      </div>

      <div className="space-y-8">
        {pending.length > 0 && (
          <div>
            <h2 className="font-display font-semibold text-[var(--tts-dark)] mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              En attente de validation ({pending.length})
            </h2>
            <ul className="space-y-3">
              {pending.map((r) => (
                <RequestRow key={r.id} r={r} role={role} />
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="font-display font-semibold text-[var(--tts-dark)] mb-4">
            Historique des requêtes traitées
          </h2>
          {resolved.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-10 text-center text-sm text-[var(--tts-text-muted)]">
              Aucune requête traitée pour le moment.
            </div>
          ) : (
            <ul className="space-y-3">
              {resolved.map((r) => (
                <RequestRow key={r.id} r={r} role={role} />
              ))}
            </ul>
          )}
        </div>

        {requests.length === 0 && !isPending && (
          <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-10 text-center text-sm text-[var(--tts-text-muted)]">
            Aucune demande de paiement trouvée.
          </div>
        )}
      </div>
    </div>
  );
}

function RequestRow({ r, role }: { r: FullRequest; role: Role }) {
  return (
    <li className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Link
            href={`/dashboard/students/${r.student_id}`}
            className="font-medium text-[var(--tts-dark)] hover:text-[var(--tts-blue)]"
          >
            {r.student?.full_name ?? "Étudiant supprimé"}
          </Link>
          <p className="text-xs text-[var(--tts-text-muted)] mt-0.5 font-mono">
            {r.student?.matricule}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold font-display text-[var(--tts-dark)]">
            {Number(r.amount).toLocaleString("fr-FR")} FCFA
          </p>
          <StatusPill status={r.status} />
        </div>
      </div>
      {r.motif && <p className="text-sm text-[var(--tts-text-muted)] mt-2">{r.motif}</p>}
      {r.recu_ecobank && (
        <p className="text-xs text-[var(--tts-text-muted)] mt-1 font-mono">
          Reçu ECOBANK : {r.recu_ecobank}
        </p>
      )}
      <p className="text-xs text-[var(--tts-text-muted)] mt-3">
        Demandée par{" "}
        <span className="font-medium text-[var(--tts-dark)]">
          {r.requested_by_profile?.full_name ?? "—"}
        </span>{" "}
        le {formatDateTime(r.requested_at)}
      </p>
      {r.validated_at && (
        <p className="text-xs text-[var(--tts-text-muted)] mt-1">
          {r.status === "rejetee" ? "Rejetée" : "Validée"} le {formatDateTime(r.validated_at)}
        </p>
      )}
      {r.terminee_at && (
        <p className="text-xs text-[var(--tts-text-muted)] mt-1">
          Marquée terminée le {formatDateTime(r.terminee_at)}
        </p>
      )}
      <div className="mt-3">
        <RequestValidationActions
          requestId={r.id}
          studentId={r.student_id}
          status={r.status}
          role={role}
          amount={r.amount}
          motif={r.motif}
          recuEcobank={r.recu_ecobank}
          proofPath={r.payment_proofs?.[0]?.storage_path || null}
        />
      </div>
    </li>
  );
}
