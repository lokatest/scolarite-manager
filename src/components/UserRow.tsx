"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUserActive, setUserRole, updateUserPhone, unlockLoginAttempts } from "@/lib/actions/admin";
import Spinner from "./Spinner";
import type { Profile } from "@/lib/types";

export default function UserRow({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState(user.phone_number ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  function handleUnlock() {
    setUnlockMessage(null);
    startTransition(async () => {
      const res = await unlockLoginAttempts(user.email);
      if (res?.error) {
        setUnlockMessage("Erreur : " + res.error);
        return;
      }
      setUnlockMessage("Blocage levé (si un blocage était actif).");
    });
  }

  function savePhone() {
    setPhoneError(null);
    startTransition(async () => {
      const res = await updateUserPhone(user.id, phoneValue);
      if (res?.error) {
        setPhoneError(res.error);
        return;
      }
      setEditingPhone(false);
      router.refresh();
    });
  }

  return (
    <tr className="hover:bg-[var(--tts-bg)]/60 transition">
      <td className="px-6 py-3.5">
        <p className="font-medium text-[var(--tts-dark)]">
          {user.full_name} {isSelf && <span className="text-xs text-[var(--tts-text-muted)]">(vous)</span>}
        </p>
        <p className="text-xs text-[var(--tts-text-muted)]">{user.email}</p>

        {editingPhone ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              value={phoneValue}
              onChange={(e) => setPhoneValue(e.target.value)}
              placeholder="+237650000000"
              className="text-xs rounded-md border border-[var(--tts-border)] px-2 py-1 w-36"
            />
            <button
              onClick={savePhone}
              disabled={isPending}
              className="text-xs font-semibold text-white rounded-md px-2 py-1 disabled:opacity-50"
              style={{ background: "var(--tts-blue)" }}
            >
              {isPending ? <Spinner size={10} /> : "OK"}
            </button>
            <button
              onClick={() => {
                setEditingPhone(false);
                setPhoneValue(user.phone_number ?? "");
                setPhoneError(null);
              }}
              className="text-xs text-[var(--tts-text-muted)] px-1"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingPhone(true)}
            className="text-xs text-[var(--tts-blue)] hover:underline mt-1"
          >
            {user.phone_number || "+ Ajouter un numéro"}
          </button>
        )}
        {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
      </td>
      <td className="px-6 py-3.5">
        <select
          defaultValue={user.role}
          disabled={isSelf || isPending}
          onChange={(e) => {
            const role = e.target.value as "admin" | "user";
            startTransition(async () => {
              await setUserRole(user.id, role);
              router.refresh();
            });
          }}
          className="text-xs font-medium rounded-lg border border-[var(--tts-border)] px-2.5 py-1.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="user">Gestionnaire</option>
          <option value="admin">Administrateur</option>
        </select>
      </td>
      <td className="px-6 py-3.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
          {user.is_active ? "Actif" : "Inactif"}
        </span>
      </td>
      <td className="px-6 py-3.5 text-right">
        <div className="flex justify-end gap-2 flex-wrap">
          <button
            disabled={isPending}
            onClick={handleUnlock}
            title="Lève un éventuel blocage de connexion (après 5 échecs)"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--tts-border)] hover:bg-[var(--tts-bg)] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Débloquer connexion
          </button>
          <button
            disabled={isSelf || isPending}
            onClick={() =>
              startTransition(async () => {
                await toggleUserActive(user.id, !user.is_active);
                router.refresh();
              })
            }
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--tts-border)] hover:bg-[var(--tts-bg)] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {user.is_active ? "Désactiver" : "Activer"}
          </button>
        </div>
        {unlockMessage && (
          <p className="text-xs text-[var(--tts-text-muted)] mt-1.5">{unlockMessage}</p>
        )}
      </td>
    </tr>
  );
}
