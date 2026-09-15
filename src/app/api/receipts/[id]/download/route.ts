import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Proxy de téléchargement du reçu PDF : télécharge le fichier depuis
 * Supabase Storage côté serveur et le renvoie directement au navigateur,
 * pour ne jamais exposer l'URL signée Supabase (domaine, chemin interne
 * du bucket) à l'utilisateur final.
 *
 * Reprend exactement la même vérification d'autorisation que
 * getReceiptDownloadUrl() dans src/lib/actions/payments.ts.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Session expirée, reconnectez-vous." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: paymentRequest } = await supabase
    .from("payment_requests")
    .select("status, receipt_path")
    .eq("id", requestId)
    .single();

  if (!paymentRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  // Même règle que getReceiptDownloadUrl : l'admin peut consulter dès la
  // validation, le gestionnaire doit attendre le statut "terminée".
  const isAllowed =
    paymentRequest.status === "terminee" ||
    (paymentRequest.status === "validee" && profile?.role === "admin");

  if (!isAllowed) {
    return NextResponse.json(
      { error: "Le reçu n'est disponible qu'une fois la demande marquée terminée." },
      { status: 403 }
    );
  }
  if (!paymentRequest.receipt_path) {
    return NextResponse.json(
      { error: "Aucun reçu n'a été généré pour cette demande." },
      { status: 404 }
    );
  }

  const { data: fileBlob, error } = await supabase.storage
    .from("receipts")
    .download(paymentRequest.receipt_path);

  if (error || !fileBlob) {
    return NextResponse.json({ error: "Impossible de charger le reçu." }, { status: 500 });
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const fileName = paymentRequest.receipt_path.split("/").pop() || "recu.pdf";

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
