import type { PaymentStatus, ClaimStatus } from "@/lib/types";

const config: Record<
  PaymentStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  en_attente: { label: "En attente", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  validee: { label: "Validée", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejetee: { label: "Rejetée", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  terminee: { label: "Terminé", bg: "bg-neutral-900", text: "text-white", dot: "bg-neutral-300" },
};

export default function StatusPill({ status }: { status: PaymentStatus | ClaimStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
