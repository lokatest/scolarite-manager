const API_URL = "https://api.sendgrid.com/v3/mail/send";

/**
 * Envoie un email à une liste de destinataires via SendGrid.
 * Ne lève jamais d'exception — retourne toujours un statut, pour ne
 * jamais bloquer l'action métier qui déclenche l'envoi (initiation ou
 * validation d'une demande de paiement).
 */
export async function sendEmail(
  recipients: string[],
  subject: string,
  text: string,
  html?: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
  const fromName = process.env.SENDGRID_FROM_NAME?.trim() || "Scolarité Manager";

  const validRecipients = recipients
    .map((r) => (r || "").replace(/\s+/g, ""))
    .filter((r) => r && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

  if (validRecipients.length === 0) {
    return { success: false, error: "Aucune adresse email valide à notifier." };
  }

  if (!apiKey || !fromEmail) {
    return {
      success: false,
      error: "Configuration email manquante (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL).",
    };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: validRecipients.map((email) => ({ email })) }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: html
          ? [
              { type: "text/plain", value: text },
              { type: "text/html", value: html },
            ]
          : [{ type: "text/plain", value: text }],
      }),
    });

    if (!res.ok) {
      return { success: false, error: `Échec de l'envoi email (${res.status}) : ${await res.text()}` };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
