"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

/**
 * Déconnexion automatique de l'onglet ouvert.
 *
 * Ce composant est un CONFORT, pas la protection principale : son
 * minuteur disparaît dès que l'onglet est fermé. La règle est appliquée
 * de manière fiable par le contrôle serveur (voir src/lib/sessionGuard.ts),
 * vérifié à chaque chargement de page, y compris après une fermeture
 * complète du navigateur.
 *
 * Son rôle ici : fermer immédiatement une session laissée ouverte à
 * l'écran, sans attendre que l'utilisateur recharge une page.
 *
 * Les durées et l'heure de début de session sont fournies par le serveur
 * à partir du cookie signé, pour que les deux mécanismes s'appuient
 * exactement sur les mêmes valeurs.
 */
export default function InactivityLogout({
  sessionStartedAt,
  inactivityLimitMs,
  absoluteLimitMs,
}: {
  sessionStartedAt: number;
  inactivityLimitMs: number;
  absoluteLimitMs: number;
}) {
  const router = useRouter();
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absoluteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function forceLogout(reason: "inactivite" | "duree_maximale") {
      const supabase = createClient();
      await supabase.auth.signOut();
      // Le middleware effacera le cookie de contrôle au prochain passage ;
      // la redirection porte le motif pour afficher le bon message.
      router.push(`/login?expired=${reason}`);
    }

    function resetInactivityTimer() {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(
        () => forceLogout("inactivite"),
        inactivityLimitMs
      );
    }

    resetInactivityTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetInactivityTimer));

    // Plafond absolu, appliqué à TOUS les rôles : la session se termine
    // à cette échéance même en cas d'activité continue. L'échéance est
    // calculée depuis l'heure réelle de connexion transmise par le
    // serveur, elle ne se réinitialise donc pas au rechargement.
    const msUntilAbsolute = sessionStartedAt + absoluteLimitMs - Date.now();
    absoluteTimerRef.current = setTimeout(
      () => forceLogout("duree_maximale"),
      Math.max(0, msUntilAbsolute)
    );

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStartedAt, inactivityLimitMs, absoluteLimitMs]);

  return null;
}
