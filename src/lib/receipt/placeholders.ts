export interface PlaceholderDef {
  token: string; // ex: "{{DATE}}"
  label: string; // libellé affiché dans l'éditeur
}

export const RECEIPT_PLACEHOLDERS: PlaceholderDef[] = [
  { token: "{{DATE}}", label: "Date de validation" },
  { token: "{{HEURE}}", label: "Heure de validation" },
  { token: "{{MONTANT_LETTRE}}", label: "Montant en lettres" },
  { token: "{{MONTANT_CHIFFRE}}", label: "Montant en chiffres" },
  { token: "{{REFERENCE}}", label: "Référence du reçu" },
  { token: "{{NUMERO}}", label: "Numéro de reçu ECOBANK" },
  { token: "{{NOM_COMPLET}}", label: "Nom complet de l'étudiant" },
];

export interface ReceiptTokenValues {
  DATE: string;
  HEURE: string;
  MONTANT_LETTRE: string;
  MONTANT_CHIFFRE: string;
  REFERENCE: string;
  NUMERO: string;
  NOM_COMPLET: string;
}

/**
 * Remplace tous les jetons {{XXX}} présents dans le HTML par leurs valeurs réelles.
 * Le remplacement se fait uniquement sur le texte, donc la mise en forme
 * (gras, couleur) portée par la balise autour du jeton est conservée.
 */
export function replaceReceiptTokens(html: string, values: ReceiptTokenValues): string {
  let result = html;
  for (const key of Object.keys(values) as (keyof ReceiptTokenValues)[]) {
    const token = `{{${key}}}`;
    result = result.split(token).join(values[key]);
  }
  return result;
}
