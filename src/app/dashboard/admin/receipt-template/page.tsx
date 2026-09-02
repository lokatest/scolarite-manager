import { getCurrentProfile } from "@/lib/get-current-profile";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ReceiptTemplateManager from "@/components/ReceiptTemplateManager";
import { getReceiptTemplateInfo } from "@/lib/actions/receiptTemplate";

export default async function ReceiptTemplatePage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const { filename, updatedAt } = await getReceiptTemplateInfo();

  return (
    <div>
      <PageHeader
        title="Template du reçu"
        subtitle="Chargez votre document Word — sa mise en forme, ses images et sa mise en page sont conservées à l'identique"
      />
      <div className="p-4 sm:p-8 max-w-3xl">
        <ReceiptTemplateManager currentFilename={filename} updatedAt={updatedAt} />
        <p className="text-xs text-[var(--tts-text-muted)] mt-4">
          Vous pouvez modifier votre document directement dans Word (ou LibreOffice, Google
          Docs...), avec toute la mise en forme que vous souhaitez — images, marges, polices,
          interlignes. Une fois prêt, chargez-le simplement ici pour remplacer le template actuel.
        </p>
      </div>
    </div>
  );
}
