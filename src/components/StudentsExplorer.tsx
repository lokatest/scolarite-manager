"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createStudent, searchStudents, deleteStudent } from "@/lib/actions/students";
import { NIVEAU_OPTIONS } from "@/lib/niveaux";
import Spinner from "./Spinner";
import SubmitButton from "./SubmitButton";
import UppercaseInput from "./UppercaseInput";
import DotsMenu from "./DotsMenu";
import EditStudentModal from "./EditStudentModal";
import EditStudentLimitedModal from "./EditStudentLimitedModal";
import type { Role, Student } from "@/lib/types";

type StudentWithCreator = Student & {
  created_by_profile?: { full_name: string } | null;
};
import { formatDateCM } from "@/lib/formatDateTime";

export default function StudentsExplorer({
  initialStudents,
  role,
}: {
  initialStudents: StudentWithCreator[];
  role: Role;
}) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithCreator[]>(initialStudents);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingStudentFull, setEditingStudentFull] = useState<Student | null>(null);
  const [editingStudentLimited, setEditingStudentLimited] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prevInitial, setPrevInitial] = useState(initialStudents);
  if (initialStudents !== prevInitial) {
    setPrevInitial(initialStudents);
    if (!query) setStudents(initialStudents);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await searchStudents(query);
        setStudents(res.data as StudentWithCreator[]);
      });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function refreshList() {
    startTransition(async () => {
      const r = await searchStudents(query);
      setStudents(r.data as StudentWithCreator[]);
    });
    router.refresh();
  }

  async function handleCreate(formData: FormData) {
    setError(null);
    const res = await createStudent(formData);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setShowModal(false);
    refreshList();
  }

  async function handleDelete(student: Student) {
    if (
      !confirm(
        `Supprimer définitivement ${student.full_name} ? Toutes ses demandes de paiement et fichiers associés seront aussi supprimés.`
      )
    ) {
      return;
    }
    setDeletingId(student.id);
    const res = await deleteStudent(student.id);
    setDeletingId(null);
    if (res?.error) {
      alert(res.error);
      return;
    }
    refreshList();
  }

  const showActionsColumn = role === "admin" || role === "user";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--tts-text-muted)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou matricule..."
            className="w-full rounded-lg border border-[var(--tts-border)] pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] focus:border-transparent transition bg-white"
          />
          {isPending && (
            <Spinner
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--tts-blue)]"
            />
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 shrink-0"
          style={{ background: "var(--tts-orange)" }}
        >
          + Nouvel étudiant
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--tts-border)] bg-[var(--tts-bg)]/60 text-left">
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Nom complet</th>
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Matricule</th>
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Filière</th>
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Niveau</th>
              {role === "admin" && (
                <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Ajouté le</th>
              )}
              {showActionsColumn && <th className="px-6 py-3 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--tts-border)]">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-[var(--tts-bg)]/60 transition">
                <td className="px-6 py-3.5">
                  <Link
                    href={`/dashboard/students/${s.id}`}
                    className="font-semibold text-[var(--tts-dark)] hover:text-[var(--tts-blue)]"
                  >
                    {s.full_name}
                  </Link>
                </td>
                <td className="px-6 py-3.5">
                  <Link
                    href={`/dashboard/students/${s.id}`}
                    className="font-mono text-xs font-medium text-[var(--tts-blue)] hover:underline"
                  >
                    {s.matricule}
                  </Link>
                </td>
                <td className="px-6 py-3.5 text-[var(--tts-text-muted)]">{s.filiere}</td>
                <td className="px-6 py-3.5">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-[var(--tts-blue)]/10 text-[var(--tts-blue)] text-xs font-medium">
                    {s.niveau}
                  </span>
                </td>
                {role === "admin" && (
                  <td className="px-6 py-3.5 text-[var(--tts-text-muted)] text-xs">
                    {formatDateCM(s.created_at)}
                    {s.created_by_profile?.full_name && (
                      <> par : {s.created_by_profile.full_name}</>
                    )}
                  </td>
                )}
                {showActionsColumn && (
                  <td className="px-6 py-3.5">
                    {deletingId === s.id ? (
                      <Spinner size={14} className="text-[var(--tts-text-muted)]" />
                    ) : role === "admin" ? (
                      <DotsMenu
                        actions={[
                          { label: "Modifier", onClick: () => setEditingStudentFull(s) },
                          {
                            label: "Supprimer",
                            danger: true,
                            onClick: () => handleDelete(s),
                          },
                        ]}
                      />
                    ) : (
                      <DotsMenu
                        actions={[
                          { label: "Modifier", onClick: () => setEditingStudentLimited(s) },
                        ]}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
            {students.length === 0 && !isPending && (
              <tr>
                <td
                  colSpan={role === "admin" ? 6 : showActionsColumn ? 5 : 4}
                  className="px-6 py-12 text-center text-[var(--tts-text-muted)]"
                >
                  Aucun étudiant trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display font-bold text-lg text-[var(--tts-dark)] mb-5">
              Nouvel étudiant
            </h2>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5">
                {error}
              </div>
            )}
            {role === "user" && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-2.5">
                Après création, vous ne pourrez plus supprimer cet étudiant.
              </div>
            )}
            <form action={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                  Matricule
                </label>
                <UppercaseInput name="matricule" placeholder="ex : LS24I026TC" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                  Nom complet
                </label>
                <UppercaseInput name="full_name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                    Filière
                  </label>
                  <UppercaseInput name="filiere" placeholder="ex : INFORMATIQUE" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--tts-dark)] mb-1.5">
                    Niveau
                  </label>
                  <select
                    name="niveau"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)] bg-white"
                  >
                    <option value="" disabled>
                      Sélectionner
                    </option>
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
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-[var(--tts-dark)] border border-[var(--tts-border)] hover:bg-[var(--tts-bg)] transition"
                >
                  Annuler
                </button>
                <SubmitButton
                  pendingLabel="Création..."
                  className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                  style={{ background: "var(--tts-orange)" }}
                >
                  Créer
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingStudentFull && (
        <EditStudentModal
          student={editingStudentFull}
          onClose={() => {
            setEditingStudentFull(null);
            refreshList();
          }}
        />
      )}

      {editingStudentLimited && (
        <EditStudentLimitedModal
          student={editingStudentLimited}
          onClose={() => {
            setEditingStudentLimited(null);
            refreshList();
          }}
        />
      )}
    </div>
  );
}
