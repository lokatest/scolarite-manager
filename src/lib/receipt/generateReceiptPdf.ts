import { amountToFrenchWords } from "./amountToWords";
import { generateReceiptReference } from "./generateReference";
import { fillDocxTemplate } from "./docxTokenReplace";
import { convertDocxToPdfViaILoveApi } from "./iloveApi";

export interface ReceiptData {
  templateBytes: Uint8Array;
  studentFullName: string;
  amount: number;
  recuEcobank: string;
  validatedAt: Date;
}

function formatAmountThousands(amount: number): string {
  return Math.round(amount).toLocaleString("en-US"); // séparateur virgule
}

function formatDateFr(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatTimeWithPeriod(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const period = hours < 12 ? "AM" : "PM";
  return `${hh}:${minutes} ${period}`;
}

/**
 * Génère le reçu de paiement en PDF à partir du vrai fichier Word du
 * template (mise en forme, images, positions 100% préservées) : les
 * balises {{...}} sont remplacées directement dans le document, sans
 * jamais toucher au texte environnant, puis le document est converti
 * en PDF via Adobe PDF Services (rendu fidèle à un export Word natif).
 */
export async function generateReceiptPdf(
  data: ReceiptData
): Promise<{ bytes: Uint8Array; reference: string; notFoundTokens: string[] }> {
  const reference = generateReceiptReference();

  const values = {
    "{{DATE}}": formatDateFr(data.validatedAt),
    "{{HEURE}}": formatTimeWithPeriod(data.validatedAt),
    "{{MONTANT_LETTRE}}": amountToFrenchWords(data.amount),
    "{{MONTANT_CHIFFRE}}": formatAmountThousands(data.amount),
    "{{REFERENCE}}": reference,
    "{{NUMERO}}": data.recuEcobank,
    "{{NOM_COMPLET}}": data.studentFullName,
  };

  const { bytes: filledDocx, notFound } = await fillDocxTemplate(data.templateBytes, values);
  const pdfBytes = await convertDocxToPdfViaILoveApi(filledDocx);

  return { bytes: pdfBytes, reference, notFoundTokens: notFound };
}
