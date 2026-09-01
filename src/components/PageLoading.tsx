import Spinner from "./Spinner";

export default function PageLoading({ label = "Chargement..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3 text-[var(--tts-text-muted)]">
      <Spinner size={28} className="text-[var(--tts-blue)]" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
