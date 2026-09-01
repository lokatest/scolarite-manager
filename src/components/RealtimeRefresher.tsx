"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * S'abonne aux changements en temps réel sur les tables clés
 * (students, payment_requests, payment_proofs) et rafraîchit
 * silencieusement les données affichées, sans que l'utilisateur
 * ait besoin de recharger la page (F5).
 */
export default function RealtimeRefresher() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    function refresh() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        router.refresh();
      }, 200);
    }

    const channel = supabase
      .channel("scolarite-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_proofs" }, refresh)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
