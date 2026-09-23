/**
 * Contrôle de session côté SERVEUR.
 *
 * Le composant InactivityLogout côté navigateur ne protège que tant
 * qu'un onglet reste ouvert : son minuteur disparaît dès que le
 * navigateur est fermé, laissant la session utilisable indéfiniment.
 *
 * Ce module applique les mêmes règles depuis le serveur, à chaque
 * chargement de page, donc y compris après une fermeture complète du
 * navigateur ou plusieurs jours d'absence :
 *   - 20 minutes sans activité  -> session terminée
 *   - 90 minutes après la connexion -> session terminée, quoi qu'il arrive
 *
 * Les deux horodatages voyagent dans un cookie signé (HMAC-SHA256) :
 * toute modification manuelle invalide la signature et entraîne la
 * fermeture de la session. Le cookie est httpOnly, donc inaccessible
 * au JavaScript de la page.
 */

export const SESSION_GUARD_COOKIE = "sm_session_guard";

export const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minutes
export const ABSOLUTE_LIMIT_MS = 90 * 60 * 1000; // 90 minutes

export type SessionGuardVerdict =
  | { valid: true; sessionStart: number }
  | { valid: false; reason: "absent" | "corrompu" | "inactivite" | "duree_maximale" };

/**
 * Secret de signature. Une variable dédiée peut être définie pour le
 * personnaliser ; à défaut, on dérive la signature de la clé de service
 * Supabase, toujours présente côté serveur. Cela évite une variable
 * d'environnement supplémentaire à configurer — et donc un cookie non
 * signé par oubli de configuration.
 */
function getSigningSecret(): string | null {
  const dedicated = process.env.SESSION_GUARD_SECRET?.trim();
  if (dedicated) return dedicated;

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return `session-guard:${fallback}`;

  return null;
}

/** Signature HMAC-SHA256, encodée en base64url (compatible cookie). */
async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));

  let binary = "";
  const bytes = new Uint8Array(signature);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Comparaison à temps constant, pour ne pas exposer la signature. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Construit la valeur du cookie : "debutSession.derniereActivite.signature"
 */
export async function buildGuardCookie(
  sessionStart: number,
  lastActivity: number
): Promise<string | null> {
  const secret = getSigningSecret();
  if (!secret) return null;

  const payload = `${sessionStart}.${lastActivity}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

/**
 * Valide le cookie et applique les deux limites de durée.
 * Retourne systématiquement un verdict, sans jamais lever d'exception.
 */
export async function verifyGuardCookie(
  cookieValue: string | undefined,
  now: number = Date.now()
): Promise<SessionGuardVerdict> {
  if (!cookieValue) return { valid: false, reason: "absent" };

  const secret = getSigningSecret();
  if (!secret) return { valid: false, reason: "corrompu" };

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return { valid: false, reason: "corrompu" };

  const [startRaw, activityRaw, providedSignature] = parts;

  let expectedSignature: string;
  try {
    expectedSignature = await sign(`${startRaw}.${activityRaw}`, secret);
  } catch {
    return { valid: false, reason: "corrompu" };
  }

  if (!safeEqual(providedSignature, expectedSignature)) {
    return { valid: false, reason: "corrompu" };
  }

  const sessionStart = Number(startRaw);
  const lastActivity = Number(activityRaw);

  if (!Number.isFinite(sessionStart) || !Number.isFinite(lastActivity)) {
    return { valid: false, reason: "corrompu" };
  }
  // Horodatages incohérents (dans le futur) : cookie rejeté
  if (sessionStart > now + 60_000 || lastActivity > now + 60_000) {
    return { valid: false, reason: "corrompu" };
  }

  if (now - lastActivity >= INACTIVITY_LIMIT_MS) {
    return { valid: false, reason: "inactivite" };
  }

  if (now - sessionStart >= ABSOLUTE_LIMIT_MS) {
    return { valid: false, reason: "duree_maximale" };
  }

  return { valid: true, sessionStart };
}

/** Options communes à toutes les écritures du cookie. */
export const GUARD_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // Durée de vie volontairement alignée sur la limite absolue : au-delà,
  // le cookie disparaît de lui-même et la session ne peut plus être
  // considérée comme valide.
  maxAge: Math.floor(ABSOLUTE_LIMIT_MS / 1000),
};

/** Message affiché sur la page de connexion selon la cause de la fin de session. */
export function guardReasonMessage(reason: string): string {
  switch (reason) {
    case "inactivite":
      return "Votre session a expiré après 20 minutes d'inactivité. Merci de vous reconnecter.";
    case "duree_maximale":
      return "Votre session a atteint sa durée maximale de 90 minutes. Merci de vous reconnecter.";
    case "corrompu":
      return "Votre session n'est plus valide. Merci de vous reconnecter.";
    default:
      return "Votre session a expiré. Merci de vous reconnecter.";
  }
}
