"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
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

/**
 * Accessible, themed dialog rendered in a portal on <body>.
 *
 * The portal is essential: an ancestor with a CSS `transform` (the app shell's
 * fade-in animation) would otherwise become the containing block for our
 * `position: fixed` overlay and throw the centering off. Rendering on <body>
 * keeps the overlay anchored to the viewport, perfectly centered.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  if (!open || !mounted) return null;

  const overlay = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-text-primary/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className={cn(
          "relative w-full bg-surface rounded-3xl shadow-soft-xl border border-border flex flex-col max-h-[88vh] animate-fade-up",
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-text-primary truncate">{title}</h2>
            {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 -mr-2 rounded-xl text-text-muted hover:bg-surface-soft hover:text-text-primary transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
