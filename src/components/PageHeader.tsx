export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b border-[var(--tts-border)] bg-white flex-wrap">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-[var(--tts-dark)] break-words">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--tts-text-muted)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
