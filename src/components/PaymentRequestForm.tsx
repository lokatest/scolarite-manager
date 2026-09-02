"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaymentRequest } from "@/lib/actions/payments";
import { MOTIF_OPTIONS } from "@/lib/motifs";
import AmountInput from "./AmountInput";
import Spinner from "./Spinner";

export default function PaymentRequestForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  function handleRemoveFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Merci de joindre une capture de la transaction.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("file", file);

    startTransition(async () => {
      const res = await createPaymentRequest(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      handleRemoveFile();
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  }

  function closeAndReset() {
    setOpen(false);
    setError(null);
    handleRemoveFile();
    formRef.current?.reset();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: "var(--tts-orange)" }}
      >
        + Initier une demande de paiement
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm p-6 animate-fade-in-up">
      <h3 className="font-display font-semibold text-[var(--tts-dark)] mb-4">
        Nouvelle demande de paiement
      </h3>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
          {error}
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="student_id" value={studentId} />

        <div>
          <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
            Montant à payer
          </label>
          <AmountInput name="amount" onValueChange={setAmount} />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
            Motif
          </label>
          <select
            name="motif"
            required
            defaultValue=""
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
            placeholder="ex : ECB-2026-000123"
            className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
            Capture de la transaction
          </label>

          {!previewUrl ? (
            <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[var(--tts-border)] py-8 cursor-pointer hover:bg-[var(--tts-bg)] transition text-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--tts-text-muted)" strokeWidth="1.7">
                <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
              <span className="text-sm text-[var(--tts-text-muted)]">
                Cliquez pour ajouter une image
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative rounded-lg border border-[var(--tts-border)] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Capture" className="w-full max-h-64 object-contain bg-[var(--tts-bg)]" />
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/95 shadow flex items-center justify-center text-red-600 hover:bg-red-50 transition"
                aria-label="Supprimer l'image"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {amount > 0 && (
          <div className="rounded-lg bg-[var(--tts-blue)]/5 border border-[var(--tts-blue)]/20 px-3.5 py-2.5">
            <p className="text-xs text-[var(--tts-text-muted)]">
              La somme à verser est :{" "}
              <span className="font-semibold text-[var(--tts-dark)]">
                {Math.max(0, Math.round(amount - amount * 0.1825 - 6000)).toLocaleString("fr-FR")}{" "}
                FCFA
              </span>
              , exonéré des commissions
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={closeAndReset}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-[var(--tts-dark)] border border-[var(--tts-border)] hover:bg-[var(--tts-bg)] transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-70 inline-flex items-center justify-center gap-2"
            style={{ background: "var(--tts-orange)" }}
          >
            {isPending && <Spinner size={15} />}
            {isPending ? "Envoi..." : "Envoyer la demande"}
          </button>
        </div>
      </form>
    </div>
  );
}
