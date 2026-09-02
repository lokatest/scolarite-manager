import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Appelée automatiquement une fois par jour par Vercel Cron (voir
 * vercel.json). Effectue une requête réelle mais sans importance vers
 * Supabase pour empêcher la mise en pause automatique après 7 jours
 * d'inactivité (limite du plan gratuit).
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

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch {
    // Même en cas d'erreur, la tentative de requête a eu lieu et compte
    // comme activité auprès de Supabase.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
