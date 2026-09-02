"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePaymentRequestStatus,
  markPaymentRequestAsTerminee,
  deletePaymentRequest,
  getReceiptDownloadUrl,
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
}: {
  requestId: string;
  studentId: string;
  status: PaymentStatus;
  role: Role;
  amount: number;
  motif: string | null;
  recuEcobank: string | null;
  proofPath: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
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

  async function handleDownloadReceipt() {
    setDownloadError(null);
    setIsDownloading(true);

    // Safari (notamment sur iPhone) bloque les fenêtres ouvertes après un
    // appel asynchrone, car ce n'est plus considéré comme une action directe
    // de l'utilisateur. On ouvre donc l'onglet immédiatement (de façon
    // synchrone, au clic), puis on lui donne l'adresse une fois récupérée.
    const newTab = window.open("", "_blank");

    const res = await getReceiptDownloadUrl(requestId);
    setIsDownloading(false);

    if (res.error) {
      setDownloadError(res.error);
      newTab?.close();
      return;
    }
    if (res.url && newTab) {
      newTab.location.href = res.url;
    } else if (res.url) {
      // Si le navigateur a quand même bloqué l'ouverture, on retente une
      // dernière fois directement (couvre les cas restants).
      window.open(res.url, "_blank");
    }
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

  const canValidateOrReject = role === "admin" && status === "en_attente";
  const canMarkTerminee = role === "user" && status === "validee";
  const canEdit = status === "en_attente";
  const canDelete = status === "en_attente" || role === "admin";

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

        {status === "terminee" && (
          <button
            disabled={isDownloading}
            onClick={handleDownloadReceipt}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50 hover:opacity-90 inline-flex items-center gap-1.5"
            style={{ background: "var(--tts-blue)" }}
          >
            {isDownloading && <Spinner size={12} />}
            Télécharger le reçu
          </button>
        )}

        {status === "terminee" && role === "admin" && (
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

      {downloadError && (
        <p className="text-xs text-red-600 mt-2 text-right">{downloadError}</p>
      )}

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
