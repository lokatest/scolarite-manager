"use client";

import { useRef, useState, useTransition } from "react";
import { uploadReceiptTemplate, generatePreviewReceipt } from "@/lib/actions/receiptTemplate";
import { RECEIPT_PLACEHOLDERS } from "@/lib/receipt/placeholders";
import { formatDateTimeCM } from "@/lib/formatDateTime";
import Spinner from "./Spinner";

export default function ReceiptTemplateManager({
  currentFilename,
  updatedAt,
}: {
  currentFilename: string | null;
  updatedAt: string | null;
}) {
  const [isUploading, startUploading] = useTransition();
  const [isPreviewing, startPreviewing] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setPreviewUrl(null);

    const formData = new FormData();
    formData.set("file", file);

    startUploading(async () => {
      const res = await uploadReceiptTemplate(formData);
      if (res?.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Template Word enregistré avec succès." });
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePreview() {
    setMessage(null);
    startPreviewing(async () => {
      const res = await generatePreviewReceipt();
      if (res?.error) {
        setMessage({ type: "error", text: res.error });
      } else if (res.dataUrl) {
        setPreviewUrl(res.dataUrl);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-6">
        <h3 className="font-display font-semibold text-[var(--tts-dark)] mb-1">
          Template actuel
        </h3>
        {currentFilename ? (
          <p className="text-sm text-[var(--tts-text-muted)]">
            <span className="font-medium text-[var(--tts-dark)]">{currentFilename}</span>
            {updatedAt && (
              <>
                {" "}
                — mis à jour le{" "}
                {formatDateTimeCM(updatedAt)}
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-[var(--tts-text-muted)]">
            Aucun template chargé — le système utilisera un modèle basique par défaut tant
            qu&apos;aucun fichier n&apos;est envoyé.
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition inline-flex items-center gap-2 disabled:opacity-60"
            style={{ background: "var(--tts-orange)" }}
          >
            {isUploading && <Spinner size={14} />}
            Charger un fichier Word (.docx)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleUpload}
          />
          {currentFilename && (
            <button
              onClick={handlePreview}
              disabled={isPreviewing}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--tts-border)] text-[var(--tts-dark)] hover:bg-[var(--tts-bg)] transition inline-flex items-center gap-2 disabled:opacity-60"
            >
              {isPreviewing && <Spinner size={14} />}
              Générer un aperçu (données d&apos;exemple)
            </button>
          )}
        </div>

        {message && (
          <div
            className={`mt-4 rounded-lg px-4 py-2.5 text-sm border ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-6">
        <h3 className="font-display font-semibold text-[var(--tts-dark)] mb-3">
          Champs à insérer dans votre document Word
        </h3>
        <p className="text-sm text-[var(--tts-text-muted)] mb-4">
          Dans Word, tapez ces balises exactement comme écrites ci-dessous, à l&apos;endroit où vous
          voulez que l&apos;information apparaisse. Elles seront automatiquement remplacées par les
          vraies valeurs au moment de la validation d&apos;un paiement.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {RECEIPT_PLACEHOLDERS.map((p) => (
            <div
              key={p.token}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[var(--tts-bg)] border border-[var(--tts-border)]"
            >
              <span className="text-xs text-[var(--tts-text-muted)]">{p.label}</span>
              <code className="text-xs font-mono font-semibold text-[var(--tts-blue)]">
                {p.token}
              </code>
            </div>
          ))}
        </div>
      </div>

      {previewUrl && (
        <div>
          <p className="text-xs font-medium text-[var(--tts-text-muted)] mb-2">
            Aperçu généré avec des données d&apos;exemple :
          </p>
          <iframe
            src={previewUrl}
            className="w-full rounded-xl border border-[var(--tts-border)]"
            style={{ height: "70vh" }}
            title="Aperçu du reçu"
          />
        </div>
      )}
    </div>
  );
}
