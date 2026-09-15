"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePaymentRequestStatus,
  markPaymentRequestAsTerminee,
  deletePaymentRequest,
  regenerateReceipt,
  getSignedProofUrl,
} from "@/lib/actions/payments";
import type { PaymentStatus, Role } from "@/lib/types";
import Spinner from "./Spinner";
import EditPaymentRequestModal from "./EditPaymentRequestModal";

export default function RequestValidationActions({
  requestId,
  studentId,
  status,
  role,
  amount,
  motif,
  recuEcobank,
  proofPath,
  requestedBy,
  currentUserId,
}: {
  requestId: string;
  studentId: string;
  status: PaymentStatus;
  role: Role;
  amount: number;
  motif: string | null;
  recuEcobank: string | null;
  proofPath: string | null;
  requestedBy: string | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isLoadingProof, setIsLoadingProof] = useState(false);

  async function handleViewProof() {
    if (proofUrl) {
      setProofUrl(null);
      return;
    }
    if (!proofPath) return;
    setIsLoadingProof(true);
    const res = await getSignedProofUrl(proofPath);
    setIsLoadingProof(false);
    if (res.url) setProofUrl(res.url);
  }

  function handleDownloadReceipt() {
    // Ouverture directe et synchrone au clic (fonctionne nativement sur
    // Safari/iPhone) : la route API vérifie l'autorisation via les
    // cookies de session et renvoie le PDF sans jamais exposer l'URL
    // interne de Supabase Storage.
    window.open(`/api/receipts/${requestId}/download`, "_blank");
  }

  function act(action: () => Promise<{ error?: string } | undefined>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  const isOwner = requestedBy === currentUserId;
  const canValidateOrReject = role === "admin" && status === "en_attente";
  const canMarkTerminee = role === "user" && status === "validee";
  const canEdit = status === "en_attente" && (isOwner || role === "admin");
  const canDelete = (status === "en_attente" && isOwner) || role === "admin";

  return (
    <div>
      {error && (
        <p className="text-xs text-red-600 mb-2 text-right">{error}</p>
      )}
      <div className="flex justify-end gap-2 flex-wrap">
        {canEdit && (
          <button
            disabled={isPending}
            onClick={() => setShowEdit(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--tts-border)] text-[var(--tts-dark)] hover:bg-[var(--tts-bg)] transition disabled:opacity-50"
          >
            Modifier
          </button>
        )}

        {canDelete && (
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm("Confirmer la suppression de cette demande ?")) {
                act(() => deletePaymentRequest(requestId, studentId));
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isPending && <Spinner size={12} />}
            Supprimer
          </button>
        )}

        {proofPath && (
          <button
            disabled={isLoadingProof}
            onClick={handleViewProof}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--tts-border)] text-[var(--tts-dark)] hover:bg-[var(--tts-bg)] transition disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isLoadingProof && <Spinner size={12} />}
            {proofUrl ? "Masquer la preuve" : "Voir la preuve"}
          </button>
        )}

        {canValidateOrReject && (
          <>
            <button
              disabled={isPending}
              onClick={() => act(() => updatePaymentRequestStatus(requestId, studentId, "rejetee"))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--tts-border)] text-[var(--tts-dark)] hover:bg-[var(--tts-bg)] transition disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isPending && <Spinner size={12} />}
              Rejeter
            </button>
            <button
              disabled={isPending}
              onClick={() => act(() => updatePaymentRequestStatus(requestId, studentId, "validee"))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50 hover:opacity-90 inline-flex items-center gap-1.5"
              style={{ background: "var(--tts-blue)" }}
            >
              {isPending && <Spinner size={12} />}
              Valider
            </button>
          </>
        )}

        {canMarkTerminee && (
          <button
            disabled={isPending}
            onClick={() => act(() => markPaymentRequestAsTerminee(requestId, studentId))}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50 hover:opacity-90 inline-flex items-center gap-1.5"
            style={{ background: "#171717" }}
          >
            {isPending && <Spinner size={12} />}
            Marquer terminé
          </button>
        )}

        {(status === "terminee" || (status === "validee" && role === "admin")) && (
          <button
            onClick={handleDownloadReceipt}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-90 inline-flex items-center gap-1.5"
            style={{ background: "var(--tts-blue)" }}
          >
            Télécharger le reçu
          </button>
        )}

        {(status === "terminee" || status === "validee") && role === "admin" && (
          <button
            disabled={isPending}
            onClick={() => act(() => regenerateReceipt(requestId, studentId))}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--tts-border)] text-[var(--tts-dark)] hover:bg-[var(--tts-bg)] transition disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isPending && <Spinner size={12} />}
            Régénérer le reçu
          </button>
        )}
      </div>

      {proofUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proofUrl}
          alt="Capture de la transaction"
          className="mt-3 rounded-lg max-h-80 w-auto border border-[var(--tts-border)] ml-auto"
        />
      )}

      {showEdit && (
        <EditPaymentRequestModal
          requestId={requestId}
          studentId={studentId}
          currentAmount={amount}
          currentMotif={motif}
          currentRecuEcobank={recuEcobank}
          currentProofPath={proofPath}
          onClose={() => {
            setShowEdit(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
