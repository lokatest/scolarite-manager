import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Appelée automatiquement une fois par jour par Vercel Cron (voir
 * vercel.json). Assure deux tâches d'entretien :
 *
 * 1. Anti-veille : une requête réelle mais sans importance vers Supabase
 *    pour empêcher la mise en pause automatique après 7 jours
 *    d'inactivité (limite du plan gratuit).
 *
 * 2. Purge des journaux de visite de plus de 30 jours, pour éviter que
 *    cette table ne grossisse indéfiniment et ne consomme le quota de
 *    base de données. Les connexions, déconnexions et actions ne sont
 *    jamais supprimées : ce sont les traces de sécurité durables.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Une requête minime, juste pour générer une vraie activité côté base.
    await supabase.from("profiles").select("id", { count: "exact", head: true });

    // Purge des visites anciennes. Un échec ici (par exemple si la
    // migration v17 n'a pas encore été exécutée) ne doit pas empêcher
    // l'anti-veille de remplir son rôle.
    let purgedVisits: number | null = null;
    const { data: purged, error: purgeError } = await supabase.rpc("purge_old_visit_logs");
    if (purgeError) {
      console.error("[Purge] Échec de la purge des visites :", purgeError.message);
    } else {
      purgedVisits = purged as number;
    }

    return NextResponse.json({
      ok: true,
      purgedVisits,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Même en cas d'erreur, la tentative de requête a eu lieu et compte
    // comme activité auprès de Supabase.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
