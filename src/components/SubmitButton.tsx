"use client";

import { useFormStatus } from "react-dom";
import Spinner from "./Spinner";

export default function SubmitButton({
  children,
  pendingLabel,
  className = "",
  style,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2`}
      style={style}
    >
      {pending && <Spinner size={15} />}
      {pending ? pendingLabel || "Chargement..." : children}
    </button>
  );
}
