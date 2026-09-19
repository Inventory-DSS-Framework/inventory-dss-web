"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MoreMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  /** Short muted line under the label explaining what it does. */
  hint?: string;
}

/**
 * "Más opciones": a small dropdown that keeps secondary actions out of the way so each
 * page leads with the one or two things the owner really needs.
 */
export function MoreMenu({ items, label = "Más opciones", className }: { items: MoreMenuItem[]; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn btn-secondary h-10 gap-2 px-4 text-sm"
      >
        <MoreHorizontal className="h-4 w-4" />
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg">
          {visible.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                type="button"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-muted/70 disabled:pointer-events-none disabled:opacity-50"
              >
                {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />}
                <span className="min-w-0">
                  <span className="block font-medium">{it.label}</span>
                  {it.hint && <span className="block text-xs text-text-muted">{it.hint}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Collapsed "Ver más detalle" block for secondary information inside a page. */
export function MoreDetails({
  summary = "Ver más detalle",
  children,
  className,
  defaultOpen,
}: {
  summary?: string;
  children: ReactNode;
  className?: string;
  /** Starts expanded (e.g. in Modo experto, or when a hidden field has an error). */
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen || undefined} className={cn("group rounded-xl border border-border-soft bg-surface-soft/40", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        {summary}
      </summary>
      <div className="border-t border-border-soft px-4 py-4">{children}</div>
    </details>
  );
}
