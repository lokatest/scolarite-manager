"use client";

export default function UppercaseInput({
  name,
  defaultValue,
  placeholder,
  required = true,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      name={name}
      required={required}
      defaultValue={defaultValue}
      placeholder={placeholder}
      style={{ textTransform: "uppercase" }}
      onChange={(e) => {
        const pos = e.target.selectionStart;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(pos, pos);
      }}
      className="w-full rounded-lg border border-[var(--tts-border)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tts-blue)]"
    />
  );
}
