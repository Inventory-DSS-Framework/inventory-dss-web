"use client";

import { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  /** Secondary line under the label (e.g. SKU, RUC). */
  description?: string;
  /** Tree indentation level (categories: Marca → Tipo). */
  depth?: number;
  icon?: ReactNode;
  disabled?: boolean;
  /** Options sharing a group render under a small uppercase header. */
  group?: string;
}

interface SelectProps<V extends string> {
  value: V | "" | null | undefined;
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  /** Shows a filter box. Defaults to on when there are more than 7 options. */
  searchable?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  emptyText?: string;
  "aria-label"?: string;
}

const PANEL_MAX_HEIGHT = 300;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Themed dropdown that replaces the native <select>.
 *
 * The panel renders in a portal with fixed positioning so it never gets clipped by a
 * modal's scroll container, flips above the trigger when there is no room below, and
 * supports keyboard navigation (↑ ↓ Enter Esc) plus type-to-filter.
 */
export function Select<V extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
  searchable,
  size = "md",
  disabled,
  invalid,
  className,
  emptyText = "Sin resultados",
  "aria-label": ariaLabel,
}: SelectProps<V>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);

  const showSearch = searchable ?? options.length > 7;
  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = normalize(query.trim());
    return options.filter((o) => normalize(`${o.label} ${o.description ?? ""}`).includes(q));
  }, [options, query]);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const up = spaceBelow < PANEL_MAX_HEIGHT + 16 && r.top > spaceBelow;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: Math.max(r.width, 220), up });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      const idx = options.findIndex((o) => o.value === value);
      setActive(idx >= 0 ? idx : 0);
      if (showSearch) setTimeout(() => searchRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (opt: SelectOption<V> | undefined) => {
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // don't close a surrounding modal
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(filtered[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const panel =
    open && pos
      ? createPortal(
          <div
            ref={panelRef}
            onKeyDown={onKeyDown}
            role="listbox"
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
            }}
            className="z-[200] overflow-hidden rounded-2xl border border-border bg-surface shadow-soft-xl animate-fade-up"
          >
            {showSearch && (
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  placeholder="Buscar…"
                  className="w-full bg-transparent py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
            )}
            <div className="overflow-y-auto p-1.5" style={{ maxHeight: PANEL_MAX_HEIGHT }}>
              {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-text-muted">{emptyText}</p>}
              {filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const showGroup = opt.group && opt.group !== filtered[i - 1]?.group;
                return (
                  <div key={`${opt.value}-${i}`}>
                    {showGroup && (
                      <p className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
                        {opt.group}
                      </p>
                    )}
                    <button
                      type="button"
                      data-index={i}
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(opt)}
                      style={{ paddingLeft: 12 + (opt.depth ?? 0) * 16 }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl py-2 pr-3 text-left text-sm transition-colors",
                        i === active && !isSelected && "bg-surface-soft",
                        isSelected ? "bg-primary-soft text-primary" : "text-text-primary",
                        opt.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {(opt.depth ?? 0) > 0 && <span className="h-px w-2.5 shrink-0 bg-border" />}
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate", isSelected && "font-semibold")}>{opt.label}</span>
                        {opt.description && (
                          <span className="block truncate text-[11px] text-text-muted">{opt.description}</span>
                        )}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center gap-2 border bg-surface-soft text-left text-text-primary transition-all focus:outline-none focus:ring-4",
          size === "md" ? "rounded-xl px-3.5 py-2.5 text-sm" : "rounded-lg px-2.5 py-1.5 text-xs",
          invalid
            ? "border-danger/50 focus:border-danger focus:ring-danger/10"
            : open
              ? "border-primary/40 bg-surface ring-4 ring-primary/10"
              : "border-border hover:border-text-muted/30 focus:border-primary/40 focus:ring-primary/10",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-text-muted")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {panel}
    </>
  );
}
