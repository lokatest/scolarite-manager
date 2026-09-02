import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Appelée automatiquement toutes les quelques heures par Vercel Cron
 * (voir vercel.json). Recherche les demandes validées dont le reçu n'a
 * pas encore été généré avec succès (statut "pending" ou "failed", avec
 * moins de 3 tentatives), et retente la génération pour chacune —
 * sans jamais dépasser le nombre maximum de tentatives, pour ne pas
 * gaspiller le quota mensuel iLoveAPI en cas de panne prolongée.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: pendingRequests } = await supabase
    .from("payment_requests")
    .select("id")
    .eq("status", "validee")
    .in("receipt_status", ["pending", "failed"])
    .lt("receipt_attempts", 3)
    .limit(10);

  if (!pendingRequests || pendingRequests.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const { attemptReceiptGeneration } = await import(
    "@/lib/receipt/attemptReceiptGeneration"
  );

  const results = [];
  for (const req of pendingRequests) {
    const result = await attemptReceiptGeneration(supabase, req.id);
    results.push({ id: req.id, success: result.success });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
