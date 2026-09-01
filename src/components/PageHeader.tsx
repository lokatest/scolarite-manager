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
    <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-6 border-b border-[var(--tts-border)] bg-white">
      <div>
        <h1 className="text-2xl font-bold font-display text-[var(--tts-dark)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--tts-text-muted)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
