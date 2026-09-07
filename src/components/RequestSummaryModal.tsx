"use client";

import Link from "next/link";
import StatusPill from "./StatusPill";
import type { PaymentRequest, Student } from "@/lib/types";

type RequestWithStudent = PaymentRequest & { student: Student };

export default function RequestSummaryModal({
  title,
  requests,
  onClose,
}: {
  title: string;
  requests: RequestWithStudent[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--tts-border)] shrink-0">
          <h2 className="font-display font-bold text-lg text-[var(--tts-dark)]">
            {title} <span className="text-[var(--tts-text-muted)] font-normal text-sm">({requests.length})</span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--tts-text-muted)] hover:bg-[var(--tts-bg)] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto">
          {requests.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--tts-text-muted)]">
              Aucune demande à afficher.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--tts-border)]">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/students/${r.student_id}`}
                    onClick={onClose}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--tts-bg)]/60 transition"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[var(--tts-dark)] hover:text-[var(--tts-blue)] truncate">
                        {r.student?.full_name ?? "Étudiant supprimé"}
                      </p>
                      <p className="text-xs text-[var(--tts-text-muted)] mt-0.5">
                        {r.student?.matricule} · {Number(r.amount).toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
