import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import PageHeader from "@/components/PageHeader";
import StudentsExplorer from "@/components/StudentsExplorer";
import type { Student } from "@/lib/types";

export default async function StudentsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("*")
    .order("full_name", { ascending: true })
    .limit(50);

  return (
    <div>
      <PageHeader
        title="Étudiants"
        subtitle="Recherchez, consultez et créez des profils étudiants"
      />
      <div className="p-4 sm:p-8">
        <StudentsExplorer initialStudents={(data || []) as Student[]} role={profile.role} />
      </div>
    </div>
  );
}
