"use client";

import { useState } from "react";
import Link from "next/link";
import RequestSummaryModal from "./RequestSummaryModal";
import type { PaymentRequest, Student } from "@/lib/types";

type RequestWithStudent = PaymentRequest & { student: Student };

export default function DashboardStats({
  studentsCount,
  pendingCount,
  totalRequestsCount,
  termineeCount,
  pendingList,
  termineeList,
}: {
  studentsCount: number;
  pendingCount: number;
  totalRequestsCount: number;
  termineeCount: number;
  pendingList: RequestWithStudent[];
  termineeList: RequestWithStudent[];
}) {
  const [showPending, setShowPending] = useState(false);
  const [showTerminee, setShowTerminee] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/students"
          className="bg-white rounded-2xl border border-[var(--tts-border)] p-6 shadow-sm hover:shadow-md hover:border-[var(--tts-dark)]/30 transition"
        >
          <p className="text-sm text-[var(--tts-text-muted)]">Étudiants enregistrés</p>
          <p className="text-3xl font-bold font-display mt-2" style={{ color: "var(--tts-dark)" }}>
            {studentsCount}
          </p>
        </Link>

        <button
          onClick={() => setShowPending(true)}
          className="text-left bg-white rounded-2xl border border-[var(--tts-border)] p-6 shadow-sm hover:shadow-md hover:border-[var(--tts-orange)]/30 transition"
        >
          <p className="text-sm text-[var(--tts-text-muted)]">Demandes en attente</p>
          <p className="text-3xl font-bold font-display mt-2" style={{ color: "var(--tts-orange)" }}>
            {pendingCount}
          </p>
        </button>

        <Link
          href="/dashboard/requests"
          className="bg-white rounded-2xl border border-[var(--tts-border)] p-6 shadow-sm hover:shadow-md hover:border-[var(--tts-blue)]/30 transition"
        >
          <p className="text-sm text-[var(--tts-text-muted)]">Nombre total de demandes</p>
          <p className="text-3xl font-bold font-display mt-2" style={{ color: "var(--tts-blue)" }}>
            {totalRequestsCount}
          </p>
        </Link>

        <button
          onClick={() => setShowTerminee(true)}
          className="text-left bg-white rounded-2xl border border-[var(--tts-border)] p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition"
        >
          <p className="text-sm text-[var(--tts-text-muted)]">Demandes terminées</p>
          <p className="text-3xl font-bold font-display mt-2" style={{ color: "#059669" }}>
            {termineeCount}
          </p>
        </button>
      </div>

      {showPending && (
        <RequestSummaryModal
          title="Demandes en attente"
          requests={pendingList}
          onClose={() => setShowPending(false)}
        />
      )}
      {showTerminee && (
        <RequestSummaryModal
          title="Demandes terminées"
          requests={termineeList}
          onClose={() => setShowTerminee(false)}
        />
      )}
    </>
  );
}
