import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-current-profile";
import PageHeader from "@/components/PageHeader";
import CreateClaimForm from "@/components/CreateClaimForm";
import ClaimCard from "@/components/ClaimCard";
import type { Claim, Profile } from "@/lib/types";

export default async function ClaimsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("claims")
    .select(
      "*, created_by_profile:profiles!claims_created_by_fkey(*), validated_by_profile:profiles!claims_validated_by_fkey(*), claim_photos(*)"
    )
    .order("created_at", { ascending: false });

  const claims = (data || []).map((c) => ({
    ...c,
    photos: c.claim_photos,
  })) as (Claim & { created_by_profile: Profile | null; validated_by_profile: Profile | null })[];

  const pending = claims.filter((c) => c.status === "en_attente");
  const resolved = claims.filter((c) => c.status !== "en_attente");

  return (
    <div>
      <PageHeader
        title="Réclamations"
        subtitle="Signalez un problème ou demandez une modification, traité par l'administrateur"
      />
      <div className="p-8 max-w-3xl">
        {profile.role === "user" && <CreateClaimForm />}

        <div className="space-y-8">
          {pending.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-[var(--tts-dark)] mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                En attente de traitement ({pending.length})
              </h2>
              <ul className="space-y-3">
                {pending.map((c) => (
                  <ClaimCard key={c.id} claim={c} role={profile.role} />
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="font-display font-semibold text-[var(--tts-dark)] mb-4">
              Historique des réclamations traitées
            </h2>
            {resolved.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-10 text-center text-sm text-[var(--tts-text-muted)]">
                Aucune réclamation traitée pour le moment.
              </div>
            ) : (
              <ul className="space-y-3">
                {resolved.map((c) => (
                  <ClaimCard key={c.id} claim={c} role={profile.role} />
                ))}
              </ul>
            )}
          </div>

          {claims.length === 0 && (
            <div className="bg-white rounded-2xl border border-[var(--tts-border)] p-10 text-center text-sm text-[var(--tts-text-muted)]">
              Aucune réclamation pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
