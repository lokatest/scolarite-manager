import type { SupabaseClient } from "@supabase/supabase-js";
import { startAndUpload, downloadResult } from "./iloveApi";
import { getDatePartsCM } from "@/lib/formatDateTime";

const MAX_ATTEMPTS = 3;

async function generateFullReceipt(
  supabase: SupabaseClient,
  requestId: string,
  templateBytes: Uint8Array,
  request: { amount: number; recu_ecobank: string | null; validated_at: string | null },
  studentInfo: { full_name: string } | null
) {
  const { fillDocxTemplate } = await import("./docxTokenReplace");
  const { amountToFrenchWords } = await import("./amountToWords");
  const { generateReceiptReference } = await import("./generateReference");

  const reference = generateReceiptReference();
  const validatedAt = new Date(request.validated_at!);

  function formatAmountThousands(amount: number) {
    return Math.round(amount).toLocaleString("en-US");
  }
  // Les composants de date/heure sont extraits explicitement dans le
  // fuseau horaire du Cameroun (voir getDatePartsCM), pour ne jamais
  // dépendre du fuseau horaire du serveur qui exécute ce code (Vercel
  // tourne en UTC, ce qui causait un décalage d'1h sur le reçu).
  function formatDateFr(date: Date) {
    const { day, month, year } = getDatePartsCM(date);
    return `${day}-${month}-${year}`;
  }
  function formatTimeWithPeriod(date: Date) {
    const { hour24, minute } = getDatePartsCM(date);
    const period = hour24 < 12 ? "AM" : "PM";
    const hh = String(hour24).padStart(2, "0");
    return `${hh}:${minute} ${period}`;
  }

  const values = {
    "{{DATE}}": formatDateFr(validatedAt),
    "{{HEURE}}": formatTimeWithPeriod(validatedAt),
    "{{MONTANT_LETTRE}}": amountToFrenchWords(request.amount),
    "{{MONTANT_CHIFFRE}}": formatAmountThousands(request.amount),
    "{{REFERENCE}}": reference,
    "{{NUMERO}}": request.recu_ecobank || "",
    "{{NOM_COMPLET}}": studentInfo?.full_name || "",
  };

  const { bytes: filledDocx } = await fillDocxTemplate(templateBytes, values);
  const started = await startAndUpload(filledDocx);

  await supabase
    .from("payment_requests")
    .update({ receipt_task_server: started.server, receipt_task_id: started.task })
    .eq("id", requestId);

  const bytes = await downloadResult(started);

  return { bytes, reference };
}

/**
 * Tente de générer (ou reprendre) le reçu PDF d'une demande de paiement,
 * et stocke le résultat. Conçu pour être appelé plusieurs fois sans
 * risque : si une tâche iLoveAPI était déjà en cours (interrompue par un
 * dépassement de délai serveur), on essaie d'abord de récupérer SON
 * résultat avant d'en démarrer une nouvelle — pour éviter de payer deux
 * fois la conversion.
 *
 * Accepte le client Supabase en paramètre : celui de l'utilisateur
 * connecté (contexte d'une action serveur classique), ou un client à
 * privilèges élevés (contexte d'une tâche planifiée sans session).
 *
 * Ne lève jamais d'exception : retourne toujours un statut.
 */
export async function attemptReceiptGeneration(
  supabase: SupabaseClient,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: request } = await supabase
    .from("payment_requests")
    .select(
      "amount, recu_ecobank, validated_at, receipt_attempts, receipt_task_server, receipt_task_id, student:students(full_name)"
    )
    .eq("id", requestId)
    .single();

  if (!request || !request.validated_at) {
    return { success: false, error: "Demande introuvable ou non validée." };
  }

  if ((request.receipt_attempts ?? 0) >= MAX_ATTEMPTS) {
    return { success: false, error: "Nombre maximum de tentatives déjà atteint." };
  }

  const attemptsNow = (request.receipt_attempts ?? 0) + 1;

  await supabase
    .from("payment_requests")
    .update({ receipt_status: "pending", receipt_attempts: attemptsNow })
    .eq("id", requestId);

  try {
    const { getReceiptTemplateBytesWithClient } = await import(
      "@/lib/receipt/getTemplateBytes"
    );
    const templateBytes = await getReceiptTemplateBytesWithClient(supabase);
    if (!templateBytes) {
      throw new Error("Aucun template Word n'a été chargé (Administration → Template du reçu).");
    }

    const studentInfo = request.student as unknown as { full_name: string } | null;

    let pdfBytes: Uint8Array;
    let reference: string | undefined;

    if (request.receipt_task_server && request.receipt_task_id) {
      try {
        pdfBytes = await downloadResult({
          server: request.receipt_task_server,
          task: request.receipt_task_id,
        });
        reference = undefined;
      } catch {
        const result = await generateFullReceipt(
          supabase,
          requestId,
          templateBytes,
          request,
          studentInfo
        );
        pdfBytes = result.bytes;
        reference = result.reference;
      }
    } else {
      const result = await generateFullReceipt(
        supabase,
        requestId,
        templateBytes,
        request,
        studentInfo
      );
      pdfBytes = result.bytes;
      reference = result.reference;
    }

    const path = `${requestId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw new Error("Erreur de stockage : " + uploadError.message);

    const updatePayload: Record<string, unknown> = {
      receipt_path: path,
      receipt_status: "success",
      receipt_last_error: null,
    };
    if (reference) updatePayload.receipt_reference = reference;

    await supabase.from("payment_requests").update(updatePayload).eq("id", requestId);

    return { success: true };
  } catch (e) {
    const message = (e as Error).message;

    await supabase
      .from("payment_requests")
      .update({
        receipt_status: attemptsNow >= MAX_ATTEMPTS ? "failed" : "pending",
        receipt_last_error: message,
      })
      .eq("id", requestId);

    return { success: false, error: message };
  }
}
