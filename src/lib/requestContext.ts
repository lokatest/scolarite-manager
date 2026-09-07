/**
 * Extrait les informations disponibles sur la requête entrante : adresse
 * IP, localisation (fournie automatiquement par Vercel via des en-têtes
 * dédiés), et type d'appareil déduit du User-Agent. Aucune de ces
 * informations n'est garantie présente (dépend de l'hébergeur et du
 * réseau du visiteur) — chaque valeur retombe sur "Inconnu(e)" si absente.
 */
export async function getRequestContext() {
  const { headers } = await import("next/headers");
  const h = await headers();

  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "Inconnue";

  const city = h.get("x-vercel-ip-city")
    ? decodeURIComponent(h.get("x-vercel-ip-city")!)
    : "Inconnue";
  const region = h.get("x-vercel-ip-country-region") || "";
  const country = h.get("x-vercel-ip-country") || "Inconnu";

  const userAgent = h.get("user-agent") || "";

  let device = "Ordinateur";
  if (/Mobi|Android(?!.*Tablet)|iPhone/i.test(userAgent)) device = "Téléphone mobile";
  else if (/Tablet|iPad/i.test(userAgent)) device = "Tablette";

  let os = "Inconnu";
  if (/Android/i.test(userAgent)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(userAgent)) os = "iOS";
  else if (/Windows/i.test(userAgent)) os = "Windows";
  else if (/Mac OS X/i.test(userAgent)) os = "macOS";
  else if (/Linux/i.test(userAgent)) os = "Linux";

  let browser = "Inconnu";
  if (/Edg\//i.test(userAgent)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(userAgent)) browser = "Chrome";
  else if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = "Safari";
  else if (/Firefox\//i.test(userAgent)) browser = "Firefox";

  return {
    ip,
    city,
    region,
    country,
    device,
    os,
    browser,
    userAgent: userAgent || "Inconnu",
  };
}
