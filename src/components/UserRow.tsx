"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUserActive, setUserRole } from "@/lib/actions/admin";
import type { Profile } from "@/lib/types";

export default function UserRow({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="hover:bg-[var(--tts-bg)]/60 transition">
      <td className="px-6 py-3.5">
        <p className="font-medium text-[var(--tts-dark)]">
          {user.full_name} {isSelf && <span className="text-xs text-[var(--tts-text-muted)]">(vous)</span>}
        </p>
        <p className="text-xs text-[var(--tts-text-muted)]">{user.email}</p>
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
      </td>
    </tr>
  );
}
