"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PremiumBackdrop, PremiumWordmark } from "./PremiumBackdrop";

interface Props {
  children: React.ReactNode;
  onClose: () => void;
  /** Extra controls rendered left of the close button. */
  actions?: React.ReactNode;
  /** Rendered under the header (e.g. progress). */
  subheader?: React.ReactNode;
  /** Allow vertical scroll inside the stage. */
  scroll?: boolean;
  label: string;
  closeOnEsc?: boolean;
  /** Viewport point the stage grows out of (the button that was clicked). */
  origin?: { x: number; y: number } | null;
}

/**
 * Full-screen stage above the app shell. Portaled to <body> so page transitions
 * (transforms on ancestors) never trap the fixed positioning.
 */
export function PremiumOverlay({ children, onClose, actions, subheader, scroll = true, label, closeOnEsc = true, origin = null }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, closeOnEsc]);

  if (!mounted) return null;

  // From the button it was opened with, when we know it; otherwise a plain fade.
  const enter: React.CSSProperties = origin
    ? ({ animation: "iris 0.72s var(--ease-out) both", "--ix": `${origin.x}px`, "--iy": `${origin.y}px` } as React.CSSProperties)
    : { animation: "ps-fade 0.5s var(--ease-out) both" };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} className="ps-root fixed inset-0 z-[150] flex flex-col" style={enter}>
      <PremiumBackdrop />
      <header className="relative z-20 flex items-center justify-between gap-4 px-5 pt-4 sm:px-8 sm:pt-6">
        <PremiumWordmark />
        <div className="flex items-center gap-2">
          {actions}
          <button onClick={onClose} aria-label="Cerrar" className="btn ps-btn-ghost h-9 w-9 rounded-full p-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>
      {subheader && <div className="relative z-20 px-5 pt-4 sm:px-8">{subheader}</div>}
      <main className={cn("relative z-10 min-h-0 flex-1", scroll ? "overflow-y-auto" : "overflow-hidden")}>{children}</main>
    </div>,
    document.body,
  );
}
