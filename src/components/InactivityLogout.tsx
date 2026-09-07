"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

const INACTIVITY_MS = 20 * 60 * 1000; // 20 minutes, pour tous les rôles
const ABSOLUTE_SESSION_MS = 90 * 60 * 1000; // 90 minutes, gestionnaires uniquement
const ABSOLUTE_DEADLINE_KEY = "sm_session_absolute_deadline";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

/**
 * Déconnecte automatiquement l'utilisateur après 20 minutes sans aucune
 * activité (souris, clavier, tactile, défilement) — pour tous les rôles.
 * Pour les gestionnaires uniquement, un délai absolu de 90 minutes
 * s'ajoute : la session se termine à cette échéance même en cas
 * d'activité continue. N'affecte que la session de cet appareil précis.
 */
export default function InactivityLogout({ role }: { role: Role }) {
  const router = useRouter();
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absoluteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function forceLogout() {
      const supabase = createClient();
      await supabase.auth.signOut();
      sessionStorage.removeItem(ABSOLUTE_DEADLINE_KEY);
      router.push("/login");
    }

    function resetInactivityTimer() {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(forceLogout, INACTIVITY_MS);
    }

    resetInactivityTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetInactivityTimer));

    // Timeout absolu, uniquement pour les gestionnaires : la session se
    // termine 90 minutes après la connexion, même en cas d'activité
    // continue. L'échéance est stockée pour survivre à un rechargement
    // de page (sinon elle se réinitialiserait à chaque F5).
    if (role === "user") {
      let deadline = Number(sessionStorage.getItem(ABSOLUTE_DEADLINE_KEY));
      if (!deadline || deadline < Date.now()) {
        deadline = Date.now() + ABSOLUTE_SESSION_MS;
        sessionStorage.setItem(ABSOLUTE_DEADLINE_KEY, String(deadline));
      }
      const msLeft = Math.max(0, deadline - Date.now());
      absoluteTimerRef.current = setTimeout(forceLogout, msLeft);
    }

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return null;
}
