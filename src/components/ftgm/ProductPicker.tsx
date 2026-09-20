"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Loader2, Package, Search, SlidersHorizontal, X } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import type { PreviewProduct } from "@/types/ftgm";

/**
 * Step 1: which products go into the run.
 *
 * A catalog can be long, so the list never dumps everything at once: search, an order
 * dropdown and six cards at a time, with the rest one click away.
 */

const PAGE = 6;

type Sort = "ventas" | "menos" | "historial" | "nombre";

const SORTS: SelectOption<Sort>[] = [
  { value: "ventas", label: "Más ventas primero" },
  { value: "menos", label: "Menos ventas primero" },
  { value: "historial", label: "Más historial primero" },
  { value: "nombre", label: "Nombre (A–Z)" },
];

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ProductPicker({
  available,
  unavailable,
  selected,
  onToggle,
  onSelectAll,
  loading,
  reasonFor,
}: {
  available: PreviewProduct[];
  unavailable: PreviewProduct[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  loading: boolean;
  reasonFor: (p: PreviewProduct) => string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("ventas");
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [showUnavailable, setShowUnavailable] = useState(false);

  const filtered = useMemo(() => {
    const q = strip(query.trim());
    const rows = available.filter(
      (p) => (!q || strip(p.name).includes(q)) && (!onlyPicked || selected.has(p.product_id)),
    );
    const by: Record<Sort, (a: PreviewProduct, b: PreviewProduct) => number> = {
      ventas: (a, b) => b.sales_count - a.sales_count,
      menos: (a, b) => a.sales_count - b.sales_count,
      historial: (a, b) => b.periods - a.periods,
      nombre: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    return [...rows].sort(by[sort]);
  }, [available, query, sort, onlyPicked, selected]);

  // A new filter starts the list over, so "ver más" never carries a stale count.
  useEffect(() => setShown(PAGE), [query, sort, onlyPicked]);

  const page = filtered.slice(0, shown);
  const allSelected = available.length > 0 && available.every((p) => selected.has(p.product_id));

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-text-muted">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Revisando tus ventas…
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <div className="py-10 text-center">
        <Package className="mx-auto h-8 w-8 text-text-muted" />
        <p className="mt-3 text-sm font-semibold text-text-primary">Aún no hay productos listos para predecir</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
          La IA necesita historial: carga tus ventas pasadas (Ventas › Ventas pasadas) o sigue vendiendo unas semanas
          más y vuelve.
        </p>
        <Link href="/sales?tab=imported" className="btn btn-primary mt-4 h-10 gap-2 px-4 text-sm">
          Cargar mis ventas <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {/* Buscar · ordenar · seleccionar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[190px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            aria-label="Buscar producto"
            className="h-10 w-full rounded-xl border border-border bg-surface-soft/60 pl-9 pr-9 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-violet/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-text-muted" />
          <Select value={sort} onChange={setSort} options={SORTS} aria-label="Ordenar productos" className="w-[210px]" />
        </div>

        <button
          type="button"
          onClick={onSelectAll}
          className={cn(
            "h-10 rounded-xl border px-3.5 text-sm font-medium transition-colors",
            allSelected
              ? "border-accent-violet/40 bg-accent-violet-soft/30 text-accent-violet"
              : "border-border bg-surface-soft/60 text-text-secondary hover:text-text-primary",
          )}
        >
          {allSelected ? "Quitar todos" : `Todos (${available.length})`}
        </button>
      </div>

      {/* Lo elegido, siempre a la vista */}
      {selected.size > 0 && (
        <button
          type="button"
          onClick={() => setOnlyPicked((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            onlyPicked
              ? "border-accent-violet/50 bg-accent-violet-soft/40 text-accent-violet"
              : "border-border bg-surface-soft/60 text-text-secondary hover:text-text-primary",
          )}
        >
          <Check className="h-3.5 w-3.5" />
          {selected.size} elegido{selected.size === 1 ? "" : "s"}
          {onlyPicked ? " · ver todos" : " · ver solo estos"}
        </button>
      )}

      {page.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-text-muted">
          Ningún producto coincide con «{query}».
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {page.map((p) => {
            const on = selected.has(p.product_id);
            return (
              <button
                key={p.product_id}
                type="button"
                onClick={() => onToggle(p.product_id)}
                aria-pressed={on}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all",
                  on
                    ? "border-accent-violet/60 bg-accent-violet-soft/30 ring-1 ring-accent-violet/30"
                    : "border-border-soft bg-surface-soft/50 hover:border-accent-violet/40 hover:bg-surface-soft/80",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
                    on ? "border-accent-violet bg-accent-violet text-white" : "border-border bg-surface",
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{p.name}</span>
                  <span className="block text-[11px] text-text-muted">
                    {p.sales_count} ventas · {Math.round(p.total_units)} u en {p.periods}{" "}
                    {p.frequency === "weekly" ? "semanas" : "meses"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cuántos se ven, y cómo ver el resto */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
          <span>
            Mostrando {page.length} de {filtered.length}
            {filtered.length !== available.length && ` (${available.length} en total)`}
          </span>
          <div className="flex items-center gap-2">
            {shown > PAGE && (
              <button type="button" onClick={() => setShown(PAGE)} className="font-semibold hover:text-text-primary">
                Ver menos
              </button>
            )}
            {shown < filtered.length && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-soft/60 px-3 py-1.5 font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                Ver {Math.min(PAGE, filtered.length - shown)} más <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {unavailable.length > 0 && (
        <div className="border-t border-border-soft pt-3">
          <button
            type="button"
            onClick={() => setShowUnavailable((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-secondary"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showUnavailable && "rotate-180")} />
            {unavailable.length} producto(s) aún no disponibles para predicción
          </button>
          {showUnavailable && (
            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {unavailable.map((p) => (
                <li key={p.product_id} className="rounded-xl bg-surface-soft/60 px-3 py-2 text-xs text-text-muted">
                  <span className="font-medium text-text-secondary">{p.name}</span> — {reasonFor(p)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
