import Sidebar from "@/components/Sidebar";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import InactivityLogout from "@/components/InactivityLogout";
import { getCurrentProfile } from "@/lib/get-current-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-screen bg-[var(--tts-bg)]">
      <RealtimeRefresher />
      <InactivityLogout />
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
