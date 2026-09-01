"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClaim } from "@/lib/actions/claims";
import Spinner from "./Spinner";

export default function CreateClaimForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFilesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    const images = selected.filter((f) => f.type.startsWith("image/"));
    if (images.length !== selected.length) {
      setError("Seules les images sont acceptées.");
    } else {
      setError(null);
    }
    setFiles((prev) => [...prev, ...images]);
    setPreviews((prev) => [...prev, ...images.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    formRef.current?.reset();
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    files.forEach((f) => formData.append("files", f));

    startTransition(async () => {
      const res = await createClaim(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: "var(--tts-orange)" }}
      >
        + Nouvelle réclamation
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm p-6 animate-fade-in-up mb-6">
      <h3 className="font-display font-semibold text-[var(--tts-dark)] mb-4">
        Nouvelle réclamation
      </h3>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
          {error}
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
            Titre
          </label>
          <input
            name="title"
            required
            placeholder="ex : Erreur sur le montant d'une demande"
            className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
            Description <span className="text-[var(--tts-text-muted)] font-normal">(optionnel)</span>
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Détaillez votre réclamation ou la modification souhaitée..."
            className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
            Photos <span className="text-[var(--tts-text-muted)] font-normal">(optionnel)</span>
          </label>
          <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[var(--tts-border)] py-6 cursor-pointer hover:bg-[var(--tts-bg)] transition text-center">
            <span className="text-sm text-[var(--tts-text-muted)]">
              Cliquez pour ajouter une ou plusieurs images
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelect}
              className="hidden"
            />
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {previews.map((p, i) => (
                <div key={i} className="relative rounded-lg border border-[var(--tts-border)] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/95 shadow flex items-center justify-center text-red-600 hover:bg-red-50 transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
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
            {isPending ? "Envoi..." : "Envoyer la réclamation"}
          </button>
        </div>
      </form>
    </div>
  );
}
