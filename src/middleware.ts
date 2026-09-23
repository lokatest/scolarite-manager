import { type NextRequest, type NextFetchEvent } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { logVisit } from "@/lib/visitLog";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { response, user } = await updateSession(request);

  // Journalisation de la visite, différée APRÈS l'envoi de la réponse
  // via waitUntil() : le visiteur n'attend jamais cette écriture, et un
  // éventuel échec n'affecte pas l'affichage de la page.
  event.waitUntil(
    logVisit({
      headers: request.headers,
      path: request.nextUrl.pathname,
      userEmail: user?.email ?? null,
      userId: user?.id ?? null,
    })
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
