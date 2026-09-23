import { parseRequestContext } from "@/lib/requestContext";

/**
 * Motifs identifiant les robots (moteurs de recherche, scanners,
 * prévisualisateurs de lien des messageries, outils de supervision).
 * Sans ce filtre, ils représenteraient la majorité des entrées et
 * rendraient le journal illisible.
 */
const BOT_PATTERNS =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|twitterbot|linkedinbot|embedly|quora|pinterest|vkshare|curl|wget|python-requests|go-http-client|java\/|okhttp|headless|phantomjs|lighthouse|pingdom|uptimerobot|statuscake|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|dataprovider|scanner|nuclei|nikto|masscan|zgrab/i;

/**
 * Chemins à ne jamais journaliser : routes techniques, fichiers
 * statiques et ressources internes de Next.js.
 */
function isIgnoredPath(path: string): boolean {
  if (path.startsWith("/api/")) return true;
  if (path.startsWith("/_next")) return true;
  if (path === "/favicon.ico" || path === "/robots.txt" || path === "/sitemap.xml") return true;
  // Tout chemin se terminant par une extension de fichier
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return true;
  return false;
}

/**
 * Détermine s'il s'agit d'une véritable arrivée sur une page, par
 * opposition à un préchargement automatique de Next.js (déclenché au
 * survol d'un lien) ou à une requête interne de données.
 *
 * Sans ce filtre, une seule navigation pourrait produire plusieurs
 * entrées, et de simples survols en créeraient de fausses.
 *
 * IMPORTANT : on ne peut PAS se fier ici aux en-têtes internes de
 * Next.js (`rsc`, `next-router-prefetch`, `next-router-state-tree`) :
 * le framework les retire de la requête avant qu'elle n'atteigne le
 * middleware. Le filtrage repose donc sur `sec-fetch-dest`, un en-tête
 * standard envoyé par le navigateur lui-même, qui vaut "document"
 * uniquement lors du chargement d'une vraie page (saisie d'URL, clic
 * sur un lien, rechargement) et "empty" pour les requêtes internes.
 */
function isRealPageVisit(h: Headers): boolean {
  // En-têtes standards de préchargement (non filtrés par Next.js)
  if (h.get("purpose")?.toLowerCase() === "prefetch") return false;
  if (h.get("x-purpose")?.toLowerCase() === "preview") return false;

  const dest = h.get("sec-fetch-dest");
  if (dest) {
    // Navigateur moderne : seul le chargement d'une page est retenu
    return dest === "document";
  }

  // Navigateur ancien sans en-tête sec-fetch-* : on accepte, les
  // filtres ci-dessus ayant déjà écarté les cas problématiques.
  return true;
}

/**
 * Enregistre une visite dans le journal d'activité.
 *
 * Écrit directement via l'API REST de Supabase plutôt qu'avec la
 * librairie cliente : le middleware s'exécute sur l'environnement Edge,
 * où un simple appel fetch est nettement plus léger.
 *
 * Ne lève jamais d'exception et n'est jamais attendue par la réponse :
 * une visite non journalisée ne doit jamais ralentir ni casser
 * l'affichage du site.
 */
export async function logVisit(params: {
  headers: Headers;
  path: string;
  userEmail: string | null;
  userId: string | null;
}): Promise<void> {
  const { headers: h, path, userEmail, userId } = params;

  try {
    if (isIgnoredPath(path)) return;
    if (!isRealPageVisit(h)) return;

    const userAgent = h.get("user-agent") || "";
    if (!userAgent || BOT_PATTERNS.test(userAgent)) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return;

    const ctx = parseRequestContext(h);

    // Provenance : on ne conserve que le domaine d'origine, et on ignore
    // la navigation interne au site (qui n'est pas une provenance).
    let referrer: string | null = null;
    const rawReferrer = h.get("referer");
    if (rawReferrer) {
      try {
        const refHost = new URL(rawReferrer).hostname;
        const selfHost = h.get("host") || "";
        if (refHost && !selfHost.includes(refHost) && !refHost.includes("scolarite-manager")) {
          referrer = refHost;
        }
      } catch {
        // Referer malformé : ignoré silencieusement
      }
    }

    await fetch(`${supabaseUrl}/rest/v1/activity_logs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        user_email: userEmail,
        event_type: "visite",
        detail: userEmail ? `Visite de ${path}` : `Visite anonyme de ${path}`,
        path,
        referrer,
        ip: ctx.ip,
        city: ctx.city,
        country: ctx.country,
        device: ctx.device,
        os: ctx.os,
        browser: ctx.browser,
      }),
    });
  } catch {
    // Journalisation best-effort : un échec ne doit jamais remonter
    // jusqu'à l'utilisateur ni interrompre la navigation.
  }
}
