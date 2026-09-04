/**
 * Fuseau horaire de référence pour toute l'application : Cameroun (UTC+1).
 * Fixé explicitement partout, pour ne jamais dépendre du fuseau horaire
 * de l'environnement d'exécution (le serveur Vercel tourne en UTC, alors
 * que le navigateur d'un utilisateur tourne à l'heure locale — sans ce
 * fuseau fixé, les deux affichaient des heures différentes).
 */
const TIMEZONE = "Africa/Douala";

export function formatDateTimeCM(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateCM(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Extrait les composants (jour, mois, année, heure, minute) d'une date,
 * exprimés dans le fuseau horaire du Cameroun — quel que soit le fuseau
 * horaire réel de la machine qui exécute ce code (serveur ou navigateur).
 * Utilisé pour générer le reçu (format JJ-MM-AAAA et HH:MM AM/PM).
 */
export function getDatePartsCM(date: Date): {
  day: string;
  month: string;
  year: string;
  hour24: number;
  minute: string;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";

  let hour24 = parseInt(get("hour"), 10);
  if (hour24 === 24) hour24 = 0; // Intl renvoie parfois "24" pour minuit avec hour12:false

  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour24,
    minute: get("minute"),
  };
}
