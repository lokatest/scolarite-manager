interface NotificationEmailData {
  title: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  studentName: string;
  matricule: string;
  amount: number;
}

/**
 * Génère un email HTML professionnel pour les notifications de demande
 * de paiement (initiation / validation). Utilise une mise en page à
 * base de tableaux (pratique standard en email) pour une compatibilité
 * maximale avec les clients mail (Gmail, Outlook...), et les couleurs
 * de la charte Scolarité Manager.
 */
export function buildNotificationEmailHtml(data: NotificationEmailData): string {
  const { title, statusLabel, statusColor, statusBg, studentName, matricule, amount } = data;
  const formattedAmount = Math.round(amount).toLocaleString("fr-FR") + " FCFA";

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background-color:#f6f8fa; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f8fa; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8ef;">

          <!-- En-tête -->
          <tr>
            <td style="background-color:#0e2841; padding:20px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" style="background-color:#e97132; border-radius:8px; width:36px; height:36px; text-align:center; vertical-align:middle;">
                    <span style="color:#ffffff; font-weight:bold; font-size:14px;">SM</span>
                  </td>
                  <td style="padding-left:12px; color:#ffffff; font-size:16px; font-weight:bold;">
                    Scolarité Manager
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Titre -->
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0; font-size:18px; font-weight:bold; color:#0e2841;">${title}</p>
            </td>
          </tr>

          <!-- Tableau d'informations -->
          <tr>
            <td style="padding:12px 28px 24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8ef; border-radius:8px; overflow:hidden;">
                <tr style="background-color:#f6f8fa;">
                  <td style="padding:12px 16px; font-size:12px; color:#5b7185; font-weight:bold; width:40%; border-bottom:1px solid #e2e8ef;">STATUT</td>
                  <td style="padding:12px 16px; border-bottom:1px solid #e2e8ef;">
                    <span style="display:inline-block; background-color:${statusBg}; color:${statusColor}; font-size:12px; font-weight:bold; padding:4px 10px; border-radius:12px;">${statusLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; font-size:12px; color:#5b7185; font-weight:bold; border-bottom:1px solid #e2e8ef;">NOM</td>
                  <td style="padding:12px 16px; font-size:14px; color:#0e2841; font-weight:bold; border-bottom:1px solid #e2e8ef;">${studentName}</td>
                </tr>
                <tr style="background-color:#f6f8fa;">
                  <td style="padding:12px 16px; font-size:12px; color:#5b7185; font-weight:bold; border-bottom:1px solid #e2e8ef;">MATRICULE</td>
                  <td style="padding:12px 16px; font-size:14px; color:#0e2841; font-family: monospace; border-bottom:1px solid #e2e8ef;">${matricule}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; font-size:12px; color:#5b7185; font-weight:bold;">MONTANT</td>
                  <td style="padding:12px 16px; font-size:15px; color:#e97132; font-weight:bold;">${formattedAmount}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="padding:16px 28px; background-color:#f6f8fa; border-top:1px solid #e2e8ef;">
              <p style="margin:0; font-size:11px; color:#5b7185;">
                Notification automatique — Scolarité Manager. Ne pas répondre à cet email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
