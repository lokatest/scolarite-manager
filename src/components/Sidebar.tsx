"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "grid" },
  { href: "/dashboard/students", label: "Étudiants", icon: "users" },
  { href: "/dashboard/requests", label: "Requêtes en cours", icon: "clock" },
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

function SidebarContent({ profile, onNavigate }: { profile: Profile; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-[var(--tts-dark)] text-white">
      <div className="px-6 py-6 flex items-center gap-3 border-b border-white/10 shrink-0">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center font-bold font-display text-sm shrink-0"
          style={{ background: "var(--tts-orange)" }}
        >
          SM
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm leading-tight">Scolarité</p>
          <p className="text-xs text-white/50 leading-tight">Manager</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
              onClick={onNavigate}
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
              onClick={onNavigate}
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

        <Link
          href="/dashboard/claims"
          onClick={onNavigate}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
            pathname.startsWith("/dashboard/claims")
              ? "bg-white/10 text-white"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          }`}
        >
          {icons.flag}
          Réclamations
        </Link>
      </nav>

      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold shrink-0">
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
    </div>
  );
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Barre supérieure mobile (visible uniquement sur petits écrans) */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-[var(--tts-dark)] text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center font-bold font-display text-xs shrink-0"
            style={{ background: "var(--tts-orange)" }}
          >
            SM
          </div>
          <p className="font-display font-semibold text-sm">Scolarité Manager</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Barre latérale desktop, toujours visible */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent profile={profile} />
      </aside>

      {/* Tiroir mobile : recouvre l'écran quand ouvert */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full animate-fade-in-up">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer le menu"
              className="absolute top-4 right-3 h-8 w-8 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10 transition z-10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <SidebarContent profile={profile} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
