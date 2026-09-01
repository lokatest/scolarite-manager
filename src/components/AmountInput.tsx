"use client";

import { useState } from "react";

function formatThousands(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function AmountInput({
  name,
  defaultValue,
  required = true,
}: {
  name: string;
  defaultValue?: number | string;
  required?: boolean;
}) {
  const [display, setDisplay] = useState(
    defaultValue ? formatThousands(String(defaultValue).replace(/\D/g, "")) : ""
  );
  const rawDigits = display.replace(/\s/g, "");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setDisplay(formatThousands(digitsOnly));
  }

  return (
    <>
      {/* Valeur numérique réelle envoyée au serveur */}
      <input type="hidden" name={name} value={rawDigits} />
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          required={required}
          placeholder="0"
          className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)]"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--tts-text-muted)] font-medium">
          FCFA
        </span>
      </div>
    </>
  );
}
