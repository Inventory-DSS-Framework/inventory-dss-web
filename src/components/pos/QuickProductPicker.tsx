"use client";

import { useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/Select";
import { useApi } from "@/hooks/useApi";
import { soles } from "@/lib/ui";
import { posApi } from "@/lib/apis/pos";
import type { CatalogProduct } from "@/types/pos";

interface Props {
  companyId: string | null;
  onPick: (product: CatalogProduct) => void;
  /** Change it (e.g. after a sale) to refresh prices and stock. */
  refreshKey?: number | string;
}

/**
 * "Acceso rápido": the whole catalog one click away, grouped by category with price and
 * stock — for products without a barcode or when the cashier doesn't remember the name.
 */
export function QuickProductPicker({ companyId, onPick, refreshKey }: Props) {
  const catalog = useApi(
    () => (companyId ? posApi.catalog(companyId, "", 200) : Promise.resolve([] as CatalogProduct[])),
    [companyId, refreshKey],
  );
  const products = useMemo(() => (catalog.data ?? []).filter((p) => p.is_active), [catalog.data]);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const options: SelectOption[] = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            (a.category_name ?? "~").localeCompare(b.category_name ?? "~", "es") || a.name.localeCompare(b.name, "es"),
        )
        .map((p) => ({
          value: p.id,
          label: p.name,
          group: p.category_name ?? "Sin categoría",
          description: `${p.sku} · ${soles(p.unit_price)} · ${p.stock_on_hand > 0 ? `${p.stock_on_hand} en stock` : "sin stock"}`,
          icon: p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt="" className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <span
              className={
                "grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold " +
                (p.stock_on_hand > 0 ? "bg-primary-soft text-primary" : "bg-danger-soft text-danger")
              }
            >
              {p.name.slice(0, 2).toUpperCase()}
            </span>
          ),
        })),
    [products],
  );

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          <LayoutGrid className="h-3.5 w-3.5 text-primary" /> Acceso rápido a productos
        </p>
        <span className="text-[11px] text-text-muted">{products.length} productos</span>
      </div>
      <Select
        value=""
        searchable
        placeholder={catalog.loading ? "Cargando catálogo…" : "Elige un producto para agregarlo al carrito"}
        emptyText="No hay productos"
        options={options}
        disabled={catalog.loading || products.length === 0}
        onChange={(id) => {
          const p = byId.get(id);
          if (p) onPick(p);
        }}
        aria-label="Acceso rápido a productos"
      />
    </div>
  );
}
