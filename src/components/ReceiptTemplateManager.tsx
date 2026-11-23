"use client";

import { useRef, useState, useTransition } from "react";
import { uploadReceiptTemplate, generatePreviewReceipt } from "@/lib/actions/receiptTemplate";
import { RECEIPT_PLACEHOLDERS } from "@/lib/receipt/placeholders";
import {
  RECEIPT_TEMPLATE_KINDS,
  RECEIPT_TEMPLATE_LABELS,
  type ReceiptTemplateInfo,
  type ReceiptTemplateKind,
} from "@/lib/receipt/templateKinds";
import { formatDateTimeCM } from "@/lib/formatDateTime";
import Spinner from "./Spinner";

const TEMPLATE_USAGE: Record<ReceiptTemplateKind, string> = {
  default: "Utilisé pour les reçus des étudiants des niveaux 1 à 5.",
  formation: "Utilisé pour les reçus des étudiants de niveau Formation.",
};

export default function ReceiptTemplateManager({
  templates,
}: {
  templates: Record<ReceiptTemplateKind, ReceiptTemplateInfo>;
}) {
  const [preview, setPreview] = useState<{ kind: ReceiptTemplateKind; url: string } | null>(
    null
  );

  return (
    <div className="space-y-5">
      {RECEIPT_TEMPLATE_KINDS.map((kind) => (
        <TemplateCard
          key={kind}
          kind={kind}
          info={templates[kind]}
          onPreview={(url) => setPreview({ kind, url })}
          onReplaced={() => setPreview((p) => (p?.kind === kind ? null : p))}
        />
      ))}

      <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-6">
        <h3 className="font-display font-semibold text-[var(--tts-dark)] mb-3">
          Champs à insérer dans vos documents Word
        </h3>
        <p className="text-sm text-[var(--tts-text-muted)] mb-4">
          Dans Word, tapez ces balises exactement comme écrites ci-dessous, à l&apos;endroit où vous
          voulez que l&apos;information apparaisse. Elles seront automatiquement remplacées par les
          vraies valeurs au moment de la validation d&apos;un paiement. Les deux modèles utilisent
          les mêmes balises.
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

      {preview && (
        <div>
          <p className="text-xs font-medium text-[var(--tts-text-muted)] mb-2">
            Aperçu du modèle {RECEIPT_TEMPLATE_LABELS[preview.kind]}, généré avec des données
            d&apos;exemple :
          </p>
          <iframe
            src={preview.url}
            className="w-full rounded-xl border border-[var(--tts-border)]"
            style={{ height: "70vh" }}
            title={`Aperçu du reçu — ${RECEIPT_TEMPLATE_LABELS[preview.kind]}`}
          />
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  kind,
  info,
  onPreview,
  onReplaced,
}: {
  kind: ReceiptTemplateKind;
  info: ReceiptTemplateInfo;
  onPreview: (url: string) => void;
  onReplaced: () => void;
}) {
  const [isUploading, startUploading] = useTransition();
  const [isPreviewing, startPreviewing] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    onReplaced();

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);
    const enAttente = info.enAttente;

    startUploading(async () => {
      const res = await uploadReceiptTemplate(formData);
      if (res?.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({
          type: "success",
          text:
            enAttente > 0
              ? `Modèle enregistré. ${enAttente > 1 ? `Les ${enAttente} reçus en attente sont` : "Le reçu en attente est"} en cours de génération.`
              : "Modèle enregistré avec succès.",
        });
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePreview() {
    setMessage(null);
    startPreviewing(async () => {
      const res = await generatePreviewReceipt(kind);
      if (res?.error) {
        setMessage({ type: "error", text: res.error });
      } else if (res.dataUrl) {
        onPreview(res.dataUrl);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-6">
      <h3 className="font-display font-semibold text-[var(--tts-dark)]">
        Modèle {RECEIPT_TEMPLATE_LABELS[kind]}
      </h3>
      <p className="text-xs text-[var(--tts-text-muted)] mb-3">{TEMPLATE_USAGE[kind]}</p>

      {info.filename ? (
        <p className="text-sm text-[var(--tts-text-muted)]">
          <span className="font-medium text-[var(--tts-dark)]">{info.filename}</span>
          {info.updatedAt && <> — mis à jour le {formatDateTimeCM(info.updatedAt)}</>}
        </p>
      ) : (
        <p className="text-sm text-[var(--tts-text-muted)]">
          Aucun fichier chargé : les reçus concernés restent en attente jusqu&apos;à l&apos;envoi
          d&apos;un fichier Word.
        </p>
      )}

      {!info.filename && info.enAttente > 0 && (
        <div className="mt-3 rounded-lg px-4 py-2.5 text-sm border bg-amber-50 border-amber-200 text-amber-800">
          {info.enAttente > 1
            ? `${info.enAttente} reçus attendent ce modèle.`
            : "1 reçu attend ce modèle."}{" "}
          Ils seront générés automatiquement dès que vous chargerez le fichier.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition inline-flex items-center gap-2 disabled:opacity-60"
          style={{ background: "var(--tts-orange)" }}
        >
          {isUploading && <Spinner size={14} />}
          {info.filename ? "Remplacer le fichier Word (.docx)" : "Charger un fichier Word (.docx)"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleUpload}
        />
        {info.filename && (
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
  );
}
