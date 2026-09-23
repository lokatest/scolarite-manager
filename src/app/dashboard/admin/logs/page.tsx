import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LogsExplorer from "@/components/LogsExplorer";

export default async function LogsPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  // Les visites étant bien plus nombreuses que les autres événements,
  // on les charge séparément : sans cela, elles rempliraient à elles
  // seules la liste et masqueraient les connexions et actions, qui sont
  // les traces de sécurité les plus importantes.
  const [{ data: activityLogs }, { data: visitLogs }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("*")
      .in("event_type", ["connexion", "deconnexion", "action"])
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("event_type", "visite")
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  const logs = [...(activityLogs || []), ...(visitLogs || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div>
      <PageHeader
        title="Logs"
        subtitle="Journal des visites, connexions, déconnexions et actions effectuées"
      />
      <div className="p-4 sm:p-8">
        <LogsExplorer initialLogs={logs} />
      </div>
    </div>
  );
}
