"use client";

import { RefObject, useMemo, useState } from "react";
import { Camera, FileSpreadsheet, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { posApi } from "@/lib/apis/pos";
import type { CatalogProduct } from "@/types/pos";
import { ProductThumb } from "./ProductThumb";

interface Props {
  companyId: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (product: CatalogProduct) => void;
  onOpenCamera: () => void;
  onOpenBulk?: () => void;
  /** Change it (e.g. after a sale) to refresh prices and stock. */
  refreshKey?: number | string;
}

/**
 * The whole catalog as a clickable grid: tap a product to add it to the cart.
 * The filter box doubles as the barcode target — a hardware scanner "types" the code
 * and presses Enter, which adds the exact match directly.
 */
export function CatalogGrid({ companyId, inputRef, onPick, onOpenCamera, onOpenBulk, refreshKey }: Props) {
  const [query, setQuery] = useState("");
  const catalog = useApi(
    () => (companyId ? posApi.catalog(companyId, "", 200) : Promise.resolve([] as CatalogProduct[])),
    [companyId, refreshKey],
  );
  const products = useMemo(() => (catalog.data ?? []).filter((p) => p.is_active), [catalog.data]);

  const term = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode ?? "").toLowerCase().includes(term),
    );
  }, [products, term]);

  const pick = (p: CatalogProduct) => {
    onPick(p);
    setQuery("");
    inputRef.current?.focus();
  };

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = query.trim();
    if (!code || !companyId) return;
    // Exact barcode / SKU first (hardware scanners end with Enter); else the top match.
    const exact = products.find(
      (p) => p.barcode?.toLowerCase() === code.toLowerCase() || p.sku.toLowerCase() === code.toLowerCase(),
    );
    if (exact) return pick(exact);
    try {
      return pick(await posApi.lookup(companyId, code));
    } catch {
      if (visible.length === 1) pick(visible[0]);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 shadow-soft">
      {/* Filter + actions */}
      <div className="flex flex-wrap items-stretch gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Busca por nombre o escanea un código"
            aria-label="Buscar producto"
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-12 text-sm text-text-primary placeholder:text-text-muted transition-all focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-surface-soft px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
            F2
          </kbd>
        </div>
        <button type="button" onClick={onOpenCamera} className="btn btn-secondary h-11 shrink-0 gap-2 px-4 text-sm" title="Escanear con la cámara">
          <Camera className="h-4 w-4" /> Escanear
        </button>
        {onOpenBulk && (
          <button type="button" onClick={onOpenBulk} className="btn btn-primary h-11 shrink-0 gap-2 px-4 text-sm" title="Cargar muchas ventas desde un Excel">
            <FileSpreadsheet className="h-4 w-4" /> Cargar ventas
          </button>
        )}
      </div>

      {/* Catalog grid */}
      <div className="mt-3 max-h-[430px] overflow-y-auto pr-0.5">
        {catalog.loading && products.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">Cargando productos…</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            {products.length === 0 ? "Aún no tienes productos. Créalos desde Inventario." : `Sin coincidencias para «${query.trim()}»`}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => {
              const out = p.stock_on_hand <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  title={out ? `${p.name} — sin stock` : `Agregar ${p.name}`}
                  className={cn(
                    "group flex flex-col gap-2 rounded-xl border p-3 text-left transition-all",
                    out
                      ? "border-border-soft bg-surface-soft/50 opacity-60"
                      : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-soft",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <ProductThumb src={p.image_url} name={p.name} size="sm" />
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        out ? "bg-danger-soft text-danger" : "bg-surface-soft text-text-muted",
                      )}
                    >
                      {out ? "Sin stock" : `${p.stock_on_hand} u`}
                    </span>
                  </div>
                  <span className="line-clamp-2 min-h-[2.2em] text-[13px] font-medium leading-snug text-text-primary">{p.name}</span>
                  <span className="text-sm font-semibold tabular-nums text-primary">{soles(p.unit_price)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
