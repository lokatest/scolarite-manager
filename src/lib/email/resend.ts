const API_URL = "https://api.resend.com/emails";

// Resend limite à 50 destinataires par requête. Au-delà, l'API rejette
// l'envoi entier : on découpe donc en lots pour ne jamais perdre un envoi.
const MAX_RECIPIENTS_PER_REQUEST = 50;

/**
 * Envoie un email à une liste de destinataires via Resend.
 * Ne lève jamais d'exception — retourne toujours un statut, pour ne
 * jamais bloquer l'action métier qui déclenche l'envoi (initiation ou
 * validation d'une demande de paiement, réclamation, alerte sécurité).
 *
 * Signature identique à l'ancien module SendGrid : les appelants n'ont
 * rien à changer d'autre que le chemin d'import.
 */
export async function sendEmail(
  recipients: string[],
  subject: string,
  text: string,
  html?: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "Scolarité Manager";

  // Nettoyage défensif : on retire tout espace ou retour à la ligne
  // invisible qui aurait pu être enregistré avec l'adresse, puis on ne
  // garde que les adresses syntaxiquement valides.
  const validRecipients = recipients
    .map((r) => (r || "").replace(/\s+/g, ""))
    .filter((r) => r && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

  if (validRecipients.length === 0) {
    return { success: false, error: "Aucune adresse email valide à notifier." };
  }

  if (!apiKey || !fromEmail) {
    return {
      success: false,
      error: "Configuration email manquante (RESEND_API_KEY / RESEND_FROM_EMAIL).",
    };
  }

  // Resend attend l'expéditeur au format "Nom <adresse@domaine.com>".
  const from = `${fromName} <${fromEmail}>`;

  // Découpage en lots de 50 destinataires maximum.
  const batches: string[][] = [];
  for (let i = 0; i < validRecipients.length; i += MAX_RECIPIENTS_PER_REQUEST) {
    batches.push(validRecipients.slice(i, i + MAX_RECIPIENTS_PER_REQUEST));
  }

  const errors: string[] = [];

  for (const batch of batches) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: batch,
          subject,
          text,
          ...(html ? { html } : {}),
        }),
      });

      if (!res.ok) {
        errors.push(`Échec de l'envoi email (${res.status}) : ${await res.text()}`);
      }
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(" | ") };
  }

  return { success: true };
}
