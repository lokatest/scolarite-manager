import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import InactivityLogout from "@/components/InactivityLogout";
import { getCurrentProfile } from "@/lib/get-current-profile";
import {
  SESSION_GUARD_COOKIE,
  INACTIVITY_LIMIT_MS,
  ABSOLUTE_LIMIT_MS,
  verifyGuardCookie,
} from "@/lib/sessionGuard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // L'heure de début de session provient du cookie signé : c'est la même
  // référence que celle utilisée par le contrôle serveur, ce qui évite
  // toute divergence entre les deux mécanismes.
  const cookieStore = await cookies();
  const verdict = await verifyGuardCookie(cookieStore.get(SESSION_GUARD_COOKIE)?.value);
  const sessionStartedAt = verdict.valid ? verdict.sessionStart : Date.now();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--tts-bg)]">
      <RealtimeRefresher />
      <InactivityLogout
        sessionStartedAt={sessionStartedAt}
        inactivityLimitMs={INACTIVITY_LIMIT_MS}
        absoluteLimitMs={ABSOLUTE_LIMIT_MS}
      />
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
