"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-7xl",
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizes;
}

const EXIT_MS = 180;

/**
 * Accessible dialog rendered in a portal on <body> (so a transformed ancestor never
 * becomes the containing block of the fixed overlay). Opens with a soft scale+blur
 * and closes with a quick exit, rendering the last open content while it leaves.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [present, setPresent] = useState(open);
  const [closing, setClosing] = useState(false);

  // Keep what was on screen while the exit animation plays (the parent may clear its data on close).
  const snapshot = useRef({ title, description, children, footer });
  if (open) snapshot.current = { title, description, children, footer };

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setClosing(false);
      return;
    }
    setClosing(true);
    const t = window.setTimeout(() => {
      setPresent(false);
      setClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !(open || present)) return null;

  const view = snapshot.current;
  const leaving = !open && closing;

  const overlay = (
    <div
      className={cn("fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6", leaving && "pointer-events-none")}
      role="dialog"
      aria-modal="true"
      aria-label={view.title}
    >
      <div
        data-closing={leaving || undefined}
        className="modal-overlay absolute inset-0 bg-[rgb(var(--shadow-color)/0.38)] backdrop-blur-[6px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        data-closing={leaving || undefined}
        className={cn(
          "modal-panel relative flex max-h-[88vh] w-full flex-col rounded-[1.75rem] border border-border bg-surface shadow-soft-xl",
          sizes[size],
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-7 pb-4 pt-6">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-semibold tracking-[-0.02em] text-text-primary">{view.title}</h2>
            {view.description && <p className="mt-1 text-sm leading-relaxed text-text-secondary">{view.description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="group -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <X className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-90" />
          </button>
        </div>
        <div className="mx-7 h-px shrink-0 bg-border" />

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">{view.children}</div>

        {view.footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 rounded-b-[1.75rem] border-t border-border bg-surface-soft/50 px-7 py-4">
            {view.footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
