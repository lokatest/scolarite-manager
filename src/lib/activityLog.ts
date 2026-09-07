import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Enregistre une entrée dans le journal d'activité (connexion,
 * déconnexion, ou action). Ne lève jamais d'exception — un échec de
 * journalisation ne doit jamais bloquer l'action réelle de l'utilisateur.
 */
export async function logActivity(params: {
  userId: string | null;
  userEmail: string | null;
  eventType: "connexion" | "deconnexion" | "action";
  detail: string;
  requestContext?: {
    ip: string;
    city: string;
    country: string;
    device: string;
    os: string;
    browser: string;
  };
}) {
  try {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const client: SupabaseClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await client.from("activity_logs").insert({
      user_id: params.userId,
      user_email: params.userEmail,
      event_type: params.eventType,
      detail: params.detail,
      ip: params.requestContext?.ip ?? null,
      city: params.requestContext?.city ?? null,
      country: params.requestContext?.country ?? null,
      device: params.requestContext?.device ?? null,
      os: params.requestContext?.os ?? null,
      browser: params.requestContext?.browser ?? null,
    });
  } catch (e) {
    console.error("[Logs] Échec de journalisation :", (e as Error).message);
  }
}
