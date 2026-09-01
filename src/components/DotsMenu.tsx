"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface DotsMenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export default function DotsMenu({ actions }: { actions: DotsMenuAction[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 176; // ~ w-44
      let left = rect.right - menuWidth;
      if (left < 8) left = 8;
      setPosition({ top: rect.bottom + 4, left });
    }
    setOpen((s) => !s);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--tts-text-muted)] hover:bg-[var(--tts-bg)] transition"
        aria-label="Actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="w-44 bg-white rounded-lg shadow-lg border border-[var(--tts-border)] py-1 z-[100]"
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  setOpen(false);
                  a.onClick();
                }}
                className={`w-full text-left px-3.5 py-2 text-sm hover:bg-[var(--tts-bg)] transition ${
                  a.danger ? "text-red-600" : "text-[var(--tts-dark)]"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
