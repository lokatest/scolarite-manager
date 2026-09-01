"use client";

import { useRef, useState } from "react";
import { updatePaymentRequestDetails, getSignedProofUrl } from "@/lib/actions/payments";
import { MOTIF_OPTIONS } from "@/lib/motifs";
import SubmitButton from "./SubmitButton";
import AmountInput from "./AmountInput";
import Spinner from "./Spinner";

export default function EditPaymentRequestModal({
  requestId,
  studentId,
  currentAmount,
  currentMotif,
  currentRecuEcobank,
  currentProofPath,
  onClose,
}: {
  requestId: string;
  studentId: string;
  currentAmount: number;
  currentMotif: string | null;
  currentRecuEcobank: string | null;
  currentProofPath: string | null;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleViewExisting() {
    if (!currentProofPath) return;
    if (existingUrl) {
      setExistingUrl(null);
      return;
    }
    setLoadingExisting(true);
    const res = await getSignedProofUrl(currentProofPath);
    setLoadingExisting(false);
    if (res.url) setExistingUrl(res.url);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Merci de sélectionner une image (JPG, PNG, WEBP...).");
      return;
    }
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function handleRemoveNewFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(formData: FormData) {
    setError(null);
    if (file) formData.set("file", file);
    const res = await updatePaymentRequestDetails(requestId, studentId, formData);
    if (res?.error) {
      setError(res.error);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-bold text-lg text-[var(--tts-dark)] mb-5">
          Modifier la demande
        </h2>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
            {error}
          </div>
        )}
        <form action={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
              Montant à payer
            </label>
            <AmountInput name="amount" defaultValue={currentAmount} />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
              Motif
            </label>
            <select
              name="motif"
              required
              defaultValue={currentMotif ?? ""}
              className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] bg-white"
            >
              <option value="" disabled>
                Sélectionner un motif
              </option>
              {MOTIF_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
              Numéro du reçu ECOBANK
            </label>
            <input
              name="recu_ecobank"
              required
              defaultValue={currentRecuEcobank ?? ""}
              className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
              Capture de la transaction
            </label>

            {!previewUrl ? (
              <div className="space-y-2">
                {currentProofPath && (
                  <div className="border border-[var(--tts-border)] rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-[var(--tts-text-muted)]">
                        Capture actuellement enregistrée
                      </p>
                      <button
                        type="button"
                        onClick={handleViewExisting}
                        disabled={loadingExisting}
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--tts-border)] hover:bg-[var(--tts-bg)] transition inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {loadingExisting && <Spinner size={12} />}
                        {existingUrl ? "Masquer" : "Voir"}
                      </button>
                    </div>
                    {existingUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={existingUrl}
                        alt="Capture actuelle"
                        className="mt-3 rounded-lg max-h-56 w-auto border border-[var(--tts-border)]"
                      />
                    )}
                  </div>
                )}
                <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[var(--tts-border)] py-6 cursor-pointer hover:bg-[var(--tts-bg)] transition text-center">
                  <span className="text-xs text-[var(--tts-text-muted)]">
                    {currentProofPath
                      ? "Cliquez pour remplacer par une nouvelle image"
                      : "Cliquez pour ajouter une image"}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="relative rounded-lg border border-[var(--tts-border)] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Nouvelle capture"
                  className="w-full max-h-56 object-contain bg-[var(--tts-bg)]"
                />
                <button
                  type="button"
                  onClick={handleRemoveNewFile}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/95 shadow flex items-center justify-center text-red-600 hover:bg-red-50 transition"
                  aria-label="Annuler le remplacement"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-[var(--tts-dark)] border border-[var(--tts-border)] hover:bg-[var(--tts-bg)] transition"
            >
              Annuler
            </button>
            <SubmitButton
              pendingLabel="Enregistrement..."
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
              style={{ background: "var(--tts-orange)" }}
            >
              Enregistrer
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
