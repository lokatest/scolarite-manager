"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "grid" },
  { href: "/dashboard/students", label: "Étudiants", icon: "users" },
  { href: "/dashboard/requests", label: "Requêtes en cours", icon: "clock" },
  { href: "/dashboard/claims", label: "Réclamations", icon: "flag" },
];

const icons: Record<string, React.ReactNode> = {
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="8.5" r="2.5" />
      <path d="M15.5 14.2c2.6.4 4.5 2.7 4.5 5.8" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.3 2" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  ),
  receipt: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  ),
  flag: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 3v18" />
      <path d="M5 4h13l-3 4 3 4H5" />
    </svg>
  ),
};

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-[var(--tts-dark)] text-white">
      <div className="px-6 py-6 flex items-center gap-3 border-b border-white/10">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center font-bold font-display text-sm"
          style={{ background: "var(--tts-orange)" }}
        >
          SM
        </div>
        <div>
          <p className="font-display font-semibold text-sm leading-tight">Scolarité</p>
          <p className="text-xs text-white/50 leading-tight">Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {icons[item.icon]}
              {item.label}
            </Link>
          );
        })}

        {profile.role === "admin" && (
          <>
            <div className="pt-4 pb-1 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
              Administration
            </div>
            <Link
              href="/dashboard/admin/users"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                pathname.startsWith("/dashboard/admin/users")
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {icons.shield}
              Utilisateurs
            </Link>
            <Link
              href="/dashboard/admin/receipt-template"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                pathname.startsWith("/dashboard/admin/receipt-template")
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {icons.receipt}
              Template du reçu
            </Link>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">
            {profile.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-white/45 truncate">
              {profile.role === "admin" ? "Administrateur" : "Gestionnaire"}
            </p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full text-left px-2 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
