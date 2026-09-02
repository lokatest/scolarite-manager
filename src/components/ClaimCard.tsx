"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateClaimStatus, deleteClaim } from "@/lib/actions/claims";
import StatusPill from "./StatusPill";
import Spinner from "./Spinner";
import EditClaimModal from "./EditClaimModal";
import ClaimPhotosViewer from "./ClaimPhotosViewer";
import type { Claim, Role } from "@/lib/types";

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

export default function ClaimCard({ claim, role }: { claim: Claim; role: Role }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function act(action: () => Promise<{ error?: string } | undefined>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  const canEditOrDelete = role === "user" && claim.status === "en_attente";
  const canValidateOrReject = role === "admin" && claim.status === "en_attente";
  const canAdminDelete = role === "admin";

  return (
    <li className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-[var(--tts-dark)] break-words">
            {claim.title}
          </p>
          {claim.description && (
            <p className="text-sm text-[var(--tts-text-muted)] mt-1 break-words whitespace-pre-wrap">
              {claim.description}
            </p>
          )}
        </div>
        <StatusPill status={claim.status} />
      </div>

      <ClaimPhotosViewer photos={claim.photos || []} />

      <div className="mt-4 pt-4 border-t border-[var(--tts-border)] space-y-1 text-xs text-[var(--tts-text-muted)]">
        <p>
          Créée par{" "}
          <span className="font-medium text-[var(--tts-dark)]">
            {claim.created_by_profile?.full_name ?? "—"}
          </span>{" "}
          le {formatDateTime(claim.created_at)}
        </p>
        {claim.validated_at && (
          <p>
            {claim.status === "rejetee" ? "Rejetée" : "Validée"} par{" "}
            <span className="font-medium text-[var(--tts-dark)]">
              {claim.validated_by_profile?.full_name ?? "—"}
            </span>{" "}
            le {formatDateTime(claim.validated_at)}
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="mt-4 flex justify-end gap-2 flex-wrap">
        {canEditOrDelete && (
          <button
            disabled={isPending}
            onClick={() => setShowEdit(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--tts-border)] text-[var(--tts-dark)] hover:bg-[var(--tts-bg)] transition disabled:opacity-50"
          >
            Modifier
          </button>
        )}
        {(canEditOrDelete || canAdminDelete) && (
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm("Confirmer la suppression de cette réclamation ?")) {
                act(() => deleteClaim(claim.id));
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isPending && <Spinner size={12} />}
            Supprimer
          </button>
        )}
        {canValidateOrReject && (
          <>
            <button
              disabled={isPending}
              onClick={() => act(() => updateClaimStatus(claim.id, "rejetee"))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--tts-border)] text-[var(--tts-dark)] hover:bg-[var(--tts-bg)] transition disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isPending && <Spinner size={12} />}
              Rejeter
            </button>
            <button
              disabled={isPending}
              onClick={() => act(() => updateClaimStatus(claim.id, "validee"))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50 hover:opacity-90 inline-flex items-center gap-1.5"
              style={{ background: "var(--tts-blue)" }}
            >
              {isPending && <Spinner size={12} />}
              Valider
            </button>
          </>
        )}
      </div>

      {showEdit && (
        <EditClaimModal
          claimId={claim.id}
          currentTitle={claim.title}
          currentDescription={claim.description}
          onClose={() => {
            setShowEdit(false);
            router.refresh();
          }}
        />
      )}
    </li>
  );
}
