import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import LogsExplorer from "@/components/LogsExplorer";

export default async function LogsPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div>
      <PageHeader
        title="Logs"
        subtitle="Journal des connexions, déconnexions et actions effectuées"
      />
      <div className="p-4 sm:p-8">
        <LogsExplorer initialLogs={data || []} />
      </div>
    </div>
  );
}
