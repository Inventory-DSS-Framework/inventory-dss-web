"use client";

import { useState } from "react";
import { Check, Layers, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { flattenTree } from "@/components/products/categoryTree";
import type { CategoryDTO } from "@/types/api";

interface ScopePickerProps {
  categories: CategoryDTO[];
  /** Selected category ids. [] = every product. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Explicit "some types" mode (so an empty selection can still show the chips). */
  mode?: "all" | "some";
  onModeChange?: (mode: "all" | "some") => void;
  /** Lets the user add a product type right here. Resolves with the new category. */
  onCreateCategory?: (name: string) => Promise<CategoryDTO | null>;
  compact?: boolean;
}

/**
 * "¿Para qué productos es esta columna?" — every product, or only some product types.
 * A type includes its subtypes (Ropa also covers Ropa › Polos).
 */
export function ScopePicker({
  categories,
  value,
  onChange,
  mode: modeProp,
  onModeChange,
  onCreateCategory,
  compact,
}: ScopePickerProps) {
  const [innerMode, setInnerMode] = useState<"all" | "some">(value.length ? "some" : "all");
  const mode = modeProp ?? innerMode;
  const setMode = (m: "all" | "some") => {
    setInnerMode(m);
    onModeChange?.(m);
    if (m === "all") onChange([]);
  };
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);

  const tree = flattenTree(categories);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const create = async () => {
    const name = draft.trim();
    if (!name || !onCreateCategory) return;
    setCreating(true);
    try {
      const cat = await onCreateCategory(name);
      if (cat) onChange([...value, cat.id]);
      setDraft("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div role="radiogroup" className="grid grid-cols-2 gap-1.5 rounded-xl bg-surface-muted/70 p-1">
        {([
          { id: "all", label: "Todos los productos", icon: Layers },
          { id: "some", label: "Solo algunos tipos", icon: Tag },
        ] as const).map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={mode === o.id}
            onClick={() => setMode(o.id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 font-medium transition-all",
              compact ? "py-1.5 text-xs" : "py-2 text-[13px]",
              mode === o.id ? "bg-surface text-text-primary shadow-soft" : "text-text-muted hover:text-text-secondary",
            )}
          >
            <o.icon className={cn("h-3.5 w-3.5", mode === o.id && "text-primary")} /> {o.label}
          </button>
        ))}
      </div>

      {mode === "some" && (
        <div className="animate-fade-up space-y-2">
          {tree.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-text-secondary">
              Aún no tienes tipos de producto. {onCreateCategory ? "Crea el primero aquí abajo." : "Créalos en Catálogo."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tree.map(({ category, depth }) => {
                const on = value.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(category.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                      on
                        ? "border-primary/40 bg-primary-soft text-primary"
                        : "border-border bg-surface text-text-secondary hover:border-primary/25 hover:text-text-primary",
                    )}
                  >
                    {on ? <Check className="h-3 w-3" /> : depth > 0 && <span className="text-text-muted">↳</span>}
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}
          {onCreateCategory && (
            <div className="flex items-center gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void create();
                  }
                }}
                placeholder="Nuevo tipo (ej. Ropa, Electro)"
                className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-surface-soft px-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void create()}
                disabled={!draft.trim() || creating}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-primary transition-colors hover:border-primary/30 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Crear
              </button>
            </div>
          )}
          {value.length === 0 && tree.length > 0 && (
            <p className="text-[11px] text-warning">Elige al menos un tipo de producto.</p>
          )}
        </div>
      )}
    </div>
  );
}
