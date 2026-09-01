"use client";

import { useState } from "react";
import { updateStudent } from "@/lib/actions/students";
import { NIVEAU_OPTIONS } from "@/lib/niveaux";
import SubmitButton from "./SubmitButton";
import UppercaseInput from "./UppercaseInput";
import type { Student } from "@/lib/types";

export default function EditStudentModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setError(null);
    const res = await updateStudent(student.id, formData);
    if (res?.error) {
      setError(res.error);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-bold text-lg text-[var(--tts-dark)] mb-5">
          Modifier l&apos;étudiant
        </h2>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
            {error}
          </div>
        )}
        <form action={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
              Matricule
            </label>
            <UppercaseInput name="matricule" defaultValue={student.matricule} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
              Nom complet
            </label>
            <UppercaseInput name="full_name" defaultValue={student.full_name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                Filière
              </label>
              <UppercaseInput name="filiere" defaultValue={student.filiere} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                Niveau
              </label>
              <select
                name="niveau"
                required
                defaultValue={student.niveau}
                className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] bg-white"
              >
                {NIVEAU_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
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
