"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 24 * 60; // 24 heures

async function getLoginAttemptsClient() {
  const { createClient: createServiceClient } = await import("@supabase/supabase-js");
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Récupère les emails des administrateurs actifs, pour les afficher
 * comme contact quand un compte est bloqué. Ne lève jamais d'exception.
 */
async function getAdminContactMessage(client: Awaited<ReturnType<typeof getLoginAttemptsClient>>) {
  const { data: admins } = await client
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .eq("is_active", true);

  const emails = (admins || []).map((a) => a.email).filter((e): e is string => Boolean(e));
  if (emails.length === 0) return "";
  return ` Veuillez contacter l'administrateur : ${emails.join(", ")}`;
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Merci de renseigner votre email et votre mot de passe." };
  }

  const attemptsClient = await getLoginAttemptsClient();
  const { data: attemptRow } = await attemptsClient
    .from("login_attempts")
    .select("failed_count, locked_until")
    .eq("email", email)
    .maybeSingle();

  // Vérifie si le compte est actuellement bloqué suite à trop d'échecs
  if (attemptRow?.locked_until && new Date(attemptRow.locked_until) > new Date()) {
    const minutesLeft = Math.ceil(
      (new Date(attemptRow.locked_until).getTime() - Date.now()) / 60000
    );
    const hoursLeft = Math.ceil(minutesLeft / 60);
    const contactMessage = await getAdminContactMessage(attemptsClient);
    return {
      error: `Trop de tentatives échouées. Réessayez dans ${hoursLeft} heure${hoursLeft > 1 ? "s" : ""}.${contactMessage}`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Échec : incrémente le compteur, et bloque 60 minutes si on atteint 5
    const newCount = (attemptRow?.failed_count ?? 0) + 1;

    if (newCount >= MAX_ATTEMPTS) {
      await attemptsClient.from("login_attempts").upsert({
        email,
        failed_count: 0,
        locked_until: new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Notifie tous les administrateurs par email, avec toutes les
      // informations disponibles sur cette tentative (IP, localisation,
      // appareil), pour permettre d'identifier une éventuelle intrusion.
      if (process.env.EMAIL_NOTIFICATIONS_ENABLED?.trim() === "true") {
        const { getRequestContext } = await import("@/lib/requestContext");
        const context = await getRequestContext();
        const { formatDateTimeCM } = await import("@/lib/formatDateTime");
        const timestamp = formatDateTimeCM(new Date().toISOString());

        const { after } = await import("next/server");
        after(async () => {
          const { data: admins } = await attemptsClient
            .from("profiles")
            .select("email")
            .eq("role", "admin")
            .eq("is_active", true);

          const adminEmails = (admins || [])
            .map((a) => a.email)
            .filter((e): e is string => Boolean(e));

          if (adminEmails.length > 0) {
            const { sendEmail } = await import("@/lib/email/sendgrid");
            const { buildSecurityAlertEmailHtml } = await import("@/lib/email/emailTemplate");
            const html = buildSecurityAlertEmailHtml({
              blockedEmail: email,
              ip: context.ip,
              city: context.city,
              region: context.region,
              country: context.country,
              device: context.device,
              os: context.os,
              browser: context.browser,
              userAgent: context.userAgent,
              timestamp,
            });
            const result = await sendEmail(
              adminEmails,
              "Alerte sécurité : blocage de connexion",
              `Compte bloqué après 5 tentatives échouées : ${email} — IP : ${context.ip} — Appareil : ${context.device} (${context.os}, ${context.browser})`,
              html
            );
            if (!result.success) {
              console.error("[Email] Échec alerte sécurité blocage :", result.error);
            }
          }
        });
      }

      const contactMessage = await getAdminContactMessage(attemptsClient);
      return {
        error: `Trop de tentatives échouées. Votre accès est bloqué pendant 24 heures.${contactMessage}`,
      };
    }

    await attemptsClient.from("login_attempts").upsert({
      email,
      failed_count: newCount,
      locked_until: null,
      updated_at: new Date().toISOString(),
    });

    const remaining = MAX_ATTEMPTS - newCount;
    return {
      error: `Identifiants incorrects. Il vous reste ${remaining} tentative${remaining > 1 ? "s" : ""} avant blocage temporaire.`,
    };
  }

  // Connexion réussie : réinitialise le compteur d'échecs
  if (attemptRow) {
    await attemptsClient.from("login_attempts").delete().eq("email", email);
  }

  // Vérifie que le compte est actif
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return {
      error:
        "Votre compte n'a pas encore été activé par un administrateur.",
    };
  }

  // Journalise la connexion réussie
  const { getRequestContext } = await import("@/lib/requestContext");
  const context = await getRequestContext();
  const { logActivity } = await import("@/lib/activityLog");
  await logActivity({
    userId: data.user.id,
    userEmail: email,
    eventType: "connexion",
    detail: "Connexion réussie",
    requestContext: context,
  });

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  const phoneNumber = String(formData.get("phone_number") || "").replace(/\s+/g, "");

  if (!email || !password || !fullName || !phoneNumber) {
    return { error: "Tous les champs sont obligatoires." };
  }
  if (password.length < 12) {
    return { error: "Le mot de passe doit contenir au moins 12 caractères." };
  }
  if (!/[A-Z]/.test(password)) {
    return { error: "Le mot de passe doit contenir au moins une majuscule." };
  }
  if (!/[0-9]/.test(password)) {
    return { error: "Le mot de passe doit contenir au moins un chiffre." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      error: "Le mot de passe doit contenir au moins un caractère spécial (ex : @, ., #, !).",
    };
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
    return {
      error:
        "Le numéro de téléphone doit être au format international, ex : +237650000000.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await supabase
      .from("profiles")
      .update({ phone_number: phoneNumber })
      .eq("id", data.user.id);
  }

  if (!data.session) {
    return {
      success:
        "Compte créé. Un administrateur doit activer votre accès avant votre première connexion (ou consultez vos emails pour confirmer votre adresse).",
    };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { logActivity } = await import("@/lib/activityLog");
    await logActivity({
      userId: user.id,
      userEmail: user.email ?? null,
      eventType: "deconnexion",
      detail: "Déconnexion",
    });
  }

  await supabase.auth.signOut();
  redirect("/login");
}
