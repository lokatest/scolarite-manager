"use client";

import { useState } from "react";
import { getSignedProofUrl } from "@/lib/actions/payments";
import Spinner from "./Spinner";
import type { PaymentProof } from "@/lib/types";

export default function PaymentProofViewer({ proofs }: { proofs: PaymentProof[] }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proof = proofs[0];
  if (!proof) return null;

  async function toggleView() {
    if (url) {
      setUrl(null);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getSignedProofUrl(proof.storage_path);
    setLoading(false);
    if (res.url) setUrl(res.url);
    else setError(res.error || "Erreur de chargement.");
  }

  return (
    <div className="border border-[var(--tts-border)] rounded-lg p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--tts-dark)]">Capture de la transaction</p>
          <p className="text-xs text-[var(--tts-text-muted)] mt-0.5">
            Ajoutée le{" "}
            {new Date(proof.uploaded_at).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          onClick={toggleView}
          disabled={loading}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--tts-border)] hover:bg-[var(--tts-bg)] transition inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading && <Spinner size={12} />}
          {url ? "Masquer" : "Voir"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={proof.file_name}
          className="mt-3 rounded-lg max-h-80 w-auto border border-[var(--tts-border)]"
        />
      )}
    </div>
  );
}
