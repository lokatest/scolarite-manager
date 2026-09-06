/**
 * Envoie un SMS à une liste de numéros via Twilio.
 * Contrairement à certains fournisseurs "bulk", l'API Twilio de base
 * envoie un message par destinataire — on boucle donc sur la liste,
 * sans jamais faire échouer l'ensemble si un seul envoi rate.
 * Ne lève jamais d'exception — retourne toujours un statut, pour ne
 * jamais bloquer l'action métier qui déclenche l'envoi (initiation ou
 * validation d'une demande de paiement).
 */
export async function sendSms(
  recipients: string[],
  message: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();

  // Nettoyage défensif : retire tout espace, tabulation ou retour à la
  // ligne qui pourrait s'être glissé dans le numéro (ex: copier-coller
  // depuis une source externe, modification manuelle en base...).
  const sanitized = recipients.map((r) => (r || "").replace(/\s+/g, ""));
  const validRecipients = sanitized.filter((r) => r && /^\+[1-9]\d{6,14}$/.test(r));
  if (validRecipients.length === 0) {
    return { success: false, error: "Aucun numéro de téléphone valide à notifier." };
  }

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error:
        "Configuration SMS manquante (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER).",
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  // MODE TEST COMPTE D'ESSAI : les comptes Twilio en essai n'autorisent
  // pas de texte libre — uniquement l'un des mots-clés de modèles
  // prédéfinis ci-dessous (imposé par Twilio, documentation officielle :
  // https://www.twilio.com/docs/usage/trials/try-out-sms).
  // Une fois le compte crédité (passage en compte payant), retire
  // simplement TWILIO_TRIAL_MODE de tes variables d'environnement (ou
  // mets-la à "false") pour retrouver le vrai message personnalisé.
  const trialMode = process.env.TWILIO_TRIAL_MODE?.trim() === "true";
  const actualBody = trialMode ? "sms_internal_alerts" : message;

  if (trialMode) {
    console.log(
      "[SMS] Mode test compte d'essai actif : message réel prévu (non envoyé tel quel) :",
      message
    );
  }

  const errors: string[] = [];

  for (const to of validRecipients) {
    try {
      const body = new URLSearchParams({ To: to, From: fromNumber, Body: actualBody });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!res.ok) {
        errors.push(`${to} : ${res.status} ${await res.text()}`);
      }
    } catch (e) {
      errors.push(`${to} : ${(e as Error).message}`);
    }
  }

  if (errors.length > 0 && errors.length === validRecipients.length) {
    // Tous les envois ont échoué
    return { success: false, error: "Échec de l'envoi SMS : " + errors.join(" | ") };
  }

  return { success: true };
}
