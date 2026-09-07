"use client";

import { useMemo, useState } from "react";
import { formatDateTimeCM } from "@/lib/formatDateTime";
import type { ActivityLog } from "@/lib/types";

const EVENT_LABELS: Record<ActivityLog["event_type"], { label: string; bg: string; text: string }> = {
  connexion: { label: "Connexion", bg: "bg-emerald-50", text: "text-emerald-700" },
  deconnexion: { label: "Déconnexion", bg: "bg-slate-100", text: "text-slate-700" },
  action: { label: "Action", bg: "bg-blue-50", text: "text-[var(--tts-blue)]" },
};

export default function LogsExplorer({ initialLogs }: { initialLogs: ActivityLog[] }) {
  const [filter, setFilter] = useState<"tout" | ActivityLog["event_type"]>("tout");
  const [userFilter, setUserFilter] = useState("");

  const uniqueUsers = useMemo(() => {
    const set = new Set(initialLogs.map((l) => l.user_email).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [initialLogs]);

  const filtered = initialLogs.filter((l) => {
    if (filter !== "tout" && l.event_type !== filter) return false;
    if (userFilter && l.user_email !== userFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="inline-flex rounded-lg border border-[var(--tts-border)] bg-white overflow-hidden">
          {(["tout", "connexion", "deconnexion", "action"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? "bg-[var(--tts-dark)] text-white"
                  : "text-[var(--tts-text-muted)] hover:bg-[var(--tts-bg)]"
              }`}
            >
              {f === "tout" ? "Tout" : EVENT_LABELS[f].label + "s"}
            </button>
          ))}
        </div>

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="text-sm rounded-lg border border-[var(--tts-border)] px-3.5 py-2 bg-white"
        >
          <option value="">Tous les utilisateurs</option>
          {uniqueUsers.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>

        <span className="text-xs text-[var(--tts-text-muted)] ml-auto">
          {filtered.length} entrée{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--tts-border)] shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--tts-border)] bg-[var(--tts-bg)]/60 text-left">
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Date / heure</th>
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Utilisateur</th>
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Type</th>
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Détail</th>
              <th className="px-6 py-3 font-medium text-[var(--tts-text-muted)]">Appareil / IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--tts-border)]">
            {filtered.map((log) => {
              const cfg = EVENT_LABELS[log.event_type];
              return (
                <tr key={log.id} className="hover:bg-[var(--tts-bg)]/60 transition">
                  <td className="px-6 py-3.5 text-xs text-[var(--tts-text-muted)] whitespace-nowrap">
                    {formatDateTimeCM(log.created_at)}
                  </td>
                  <td className="px-6 py-3.5 text-[var(--tts-dark)] font-medium">
                    {log.user_email || "—"}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-[var(--tts-dark)]">{log.detail}</td>
                  <td className="px-6 py-3.5 text-xs text-[var(--tts-text-muted)]">
                    {log.device && (
                      <div>
                        {log.device} · {log.os} · {log.browser}
                      </div>
                    )}
                    {log.ip && <div className="font-mono">{log.ip}</div>}
                    {(log.city || log.country) && (
                      <div>
                        {[log.city, log.country].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[var(--tts-text-muted)]">
                  Aucune entrée pour ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
