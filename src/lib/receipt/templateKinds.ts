/**
 * Les deux modèles Word du reçu de paiement :
 * - "default"   : Université, pour les étudiants des niveaux 1 à 5. C'est le
 *                 modèle historique : son identifiant "default" est conservé
 *                 tel quel en base, rien n'est à migrer ;
 * - "formation" : pour les étudiants de niveau Formation.
 *
 * Module sans "use server" : utilisable côté serveur comme côté navigateur.
 */
export const RECEIPT_TEMPLATE_KINDS = ["default", "formation"] as const;

export type ReceiptTemplateKind = (typeof RECEIPT_TEMPLATE_KINDS)[number];

export const RECEIPT_TEMPLATE_LABELS: Record<ReceiptTemplateKind, string> = {
  default: "Université (niveaux 1 à 5)",
  formation: "Formation",
};

/** État d'un modèle, tel qu'affiché sur la page Template du reçu. */
export interface ReceiptTemplateInfo {
  filename: string | null;
  updatedAt: string | null;
  /** Reçus de demandes validées qui attendent encore leur génération. */
  enAttente: number;
}

export function isReceiptTemplateKind(value: unknown): value is ReceiptTemplateKind {
  return (
    typeof value === "string" && (RECEIPT_TEMPLATE_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Choisit le modèle d'après le niveau de l'étudiant : « Formation » donne
 * le modèle Formation ; tout autre niveau (1 à 5, ou ancienne valeur hors
 * liste) donne le modèle Université.
 */
export function templateKindForNiveau(niveau: string | null | undefined): ReceiptTemplateKind {
  return (niveau ?? "").trim().toLowerCase() === "formation" ? "formation" : "default";
}

/** Message enregistré sur une demande dont le modèle n'est pas encore chargé. */
export function missingTemplateMessage(kind: ReceiptTemplateKind): string {
  return `Le modèle de reçu « ${RECEIPT_TEMPLATE_LABELS[kind]} » n'a pas encore été chargé (Administration → Template du reçu).`;
}

export function isMissingTemplateMessage(message: string | null | undefined): boolean {
  return (
    !!message &&
    message.startsWith("Le modèle de reçu «") &&
    message.includes("n'a pas encore été chargé")
  );
}
