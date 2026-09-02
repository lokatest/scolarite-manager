import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import PageHeader from "@/components/PageHeader";
import RequestsExplorer from "@/components/RequestsExplorer";
import type { PaymentRequest, Profile, Student } from "@/lib/types";

export default async function RequestsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("payment_requests")
    .select(
      "*, student:students(*), requested_by_profile:profiles!payment_requests_requested_by_fkey(*), payment_proofs(storage_path)"
    )
    .order("requested_at", { ascending: false });

  const requests = (data || []) as (PaymentRequest & {
    student: Student;
    requested_by_profile: Profile | null;
    payment_proofs: { storage_path: string }[];
  })[];

  return (
    <div>
      <PageHeader
        title="Requêtes en cours"
        subtitle="Toutes les demandes de paiement, classées de la plus récente à la plus ancienne"
      />
      <div className="p-4 sm:p-8 max-w-4xl">
        <RequestsExplorer initialRequests={requests} role={profile.role} />
      </div>
    </div>
  );
}
