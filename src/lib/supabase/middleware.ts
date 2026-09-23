import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_GUARD_COOKIE,
  GUARD_COOKIE_OPTIONS,
  buildGuardCookie,
  verifyGuardCookie,
} from "@/lib/sessionGuard";

/**
 * Supprime toute trace de session sur une réponse : les cookies
 * d'authentification Supabase (préfixés "sb-") et le cookie de contrôle
 * de session.
 *
 * Nécessaire car les cookies effacés par supabase.auth.signOut() sont
 * appliqués à la réponse construite dans createServerClient, pas à la
 * réponse de redirection que l'on retourne ensuite.
 */
function clearSessionCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { ...GUARD_COOKIE_OPTIONS, maxAge: 0 });
    }
  }
  response.cookies.set(SESSION_GUARD_COOKIE, "", { ...GUARD_COOKIE_OPTIONS, maxAge: 0 });
}

/**
 * Rafraîchit la session Supabase, applique le contrôle de durée de
 * session côté serveur, puis les redirections d'accès.
 *
 * Retourne aussi l'utilisateur identifié : le middleware s'en sert pour
 * journaliser la visite sans avoir à refaire un appel d'authentification.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: { id: string; email: string | null } | null;
}> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUser = user ? { id: user.id, email: user.email ?? null } : null;

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");
  const isPublicAsset = path.startsWith("/_next") || path.startsWith("/favicon");

  // -------------------------------------------------------------------
  // Contrôle de durée de session, appliqué côté serveur
  //
  // Vérifié à chaque chargement de page, donc y compris après fermeture
  // complète du navigateur ou plusieurs jours d'absence — contrairement
  // au minuteur du navigateur, qui disparaît avec l'onglet.
  // -------------------------------------------------------------------
  let refreshedGuardCookie: string | null = null;

  if (user) {
    const verdict = await verifyGuardCookie(
      request.cookies.get(SESSION_GUARD_COOKIE)?.value
    );

    if (!verdict.valid) {
      // Révocation réelle du jeton auprès de Supabase : sans cela, le
      // jeton resterait utilisable directement contre l'API Supabase,
      // sans jamais repasser par ce middleware.
      try {
        await supabase.auth.signOut();
      } catch {
        // L'échec de révocation ne doit pas empêcher la déconnexion
        // locale : les cookies sont effacés dans tous les cas.
      }

      // Déjà sur une page d'authentification : on se contente d'effacer
      // les cookies sans rediriger. Cela rend toute boucle de
      // redirection impossible, même si le navigateur n'appliquait pas
      // immédiatement la suppression des cookies.
      if (isAuthRoute) {
        const cleanResponse = NextResponse.next({ request });
        clearSessionCookies(request, cleanResponse);
        return { response: cleanResponse, user: null };
      }

      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("expired", verdict.reason);

      const redirectResponse = NextResponse.redirect(url);
      clearSessionCookies(request, redirectResponse);
      return { response: redirectResponse, user: null };
    }

    // Session valide : on repousse l'échéance d'inactivité, sans jamais
    // toucher à l'heure de début (le plafond absolu reste inchangé).
    refreshedGuardCookie = await buildGuardCookie(verdict.sessionStart, Date.now());
  }

  // -------------------------------------------------------------------
  // Redirections d'accès
  // -------------------------------------------------------------------
  if (!user && !isAuthRoute && !isPublicAsset && path !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return { response: NextResponse.redirect(url), user: currentUser };
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    if (refreshedGuardCookie) {
      redirectResponse.cookies.set(
        SESSION_GUARD_COOKIE,
        refreshedGuardCookie,
        GUARD_COOKIE_OPTIONS
      );
    }
    return { response: redirectResponse, user: currentUser };
  }

  if (refreshedGuardCookie) {
    supabaseResponse.cookies.set(
      SESSION_GUARD_COOKIE,
      refreshedGuardCookie,
      GUARD_COOKIE_OPTIONS
    );
  }

  return { response: supabaseResponse, user: currentUser };
}
