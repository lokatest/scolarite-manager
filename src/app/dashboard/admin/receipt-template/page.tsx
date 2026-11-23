import { getCurrentProfile } from "@/lib/get-current-profile";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ReceiptTemplateManager from "@/components/ReceiptTemplateManager";
import { getReceiptTemplateInfo } from "@/lib/actions/receiptTemplate";

export default async function ReceiptTemplatePage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const templates = await getReceiptTemplateInfo();

  return (
    <div>
      <PageHeader
        title="Template du reçu"
        subtitle="Deux modèles Word : Université (niveaux 1 à 5) et Formation. Le bon modèle est choisi automatiquement selon le niveau de l'étudiant."
      />
      <div className="p-4 sm:p-8 max-w-3xl">
        <ReceiptTemplateManager templates={templates} />
        <p className="text-xs text-[var(--tts-text-muted)] mt-4">
          Vous pouvez modifier vos documents directement dans Word (ou LibreOffice, Google
          Docs...), avec toute la mise en forme que vous souhaitez — images, marges, polices,
          interlignes. Leur mise en forme, leurs images et leur mise en page sont conservées à
          l&apos;identique. Une fois un document prêt, chargez-le dans le bon modèle pour remplacer
          le fichier actuel.
        </p>
      </div>
    </div>
  );
}
