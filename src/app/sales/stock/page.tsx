"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { inputClass, soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { posApi } from "@/lib/apis/pos";
import { customFieldsApi } from "@/lib/apis/custom-fields";
import type { CatalogProduct } from "@/types/pos";
import { ProductThumb } from "@/components/pos/ProductThumb";
import { StockBadge, stockTone, type StockTone } from "@/components/pos/StockBadge";
import { ProductDetailCard } from "@/components/pos/ProductDetailCard";

const FILTERS: { id: "all" | StockTone; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "ok", label: "Disponibles" },
  { id: "low", label: "Stock bajo" },
  { id: "out", label: "Sin stock" },
];

/** "Consultar productos": read-only price & stock lookup, usable by sellers. */
export default function StockLookupPage() {
  const companyId = useCompanyId();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | StockTone>("all");
  const [selected, setSelected] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const catalog = useApi(
    () => (companyId ? posApi.catalog(companyId, q, 200) : Promise.resolve([])),
    [companyId, q],
  );
  const fields = useApi(
    () => (companyId ? customFieldsApi.list(companyId, "product") : Promise.resolve([])),
    [companyId],
  );
  const labels = useMemo(() => Object.fromEntries((fields.data ?? []).map((f) => [f.key, f.label])), [fields.data]);

  const all = catalog.data ?? [];
  const counts = useMemo(() => {
    const c = { all: all.length, ok: 0, low: 0, out: 0 };
    all.forEach((p) => c[stockTone(p.stock_on_hand, p.reorder_point)]++);
    return c;
  }, [all]);
  const items = filter === "all" ? all : all.filter((p) => stockTone(p.stock_on_hand, p.reorder_point) === filter);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="Punto de venta"
        title="Consultar productos"
        description="Busca un producto para ver su precio, código y stock disponible."
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, SKU, código de barras o categoría"
            className={inputClass(false, "h-12 rounded-2xl pl-12 text-base")}
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-muted/70 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-9 rounded-lg px-3 text-sm font-medium transition-all",
                filter === f.id ? "bg-surface text-text-primary shadow-soft" : "text-text-muted hover:text-text-secondary",
              )}
            >
              {f.label} <span className="ml-1 text-xs text-text-muted">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <DataState
        loading={catalog.loading && !catalog.data}
        error={catalog.error}
        empty={!catalog.loading && items.length === 0}
        onRetry={catalog.reload}
        emptyState={
          <EmptyState icon={PackageSearch} title="Sin resultados" description="Prueba con otro nombre, SKU o código de barras." />
        }
      >
        <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", catalog.loading && "opacity-60")}>
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-soft-lg"
            >
              <div className="aspect-[4/3] w-full bg-surface-soft p-3">
                <ProductThumb src={p.image_url} name={p.name} size="lg" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="line-clamp-2 text-sm font-semibold text-text-primary group-hover:text-primary">{p.name}</p>
                <p className="font-mono text-[11px] text-text-muted">
                  {p.sku}
                  {p.barcode ? ` · ${p.barcode}` : ""}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="font-display text-lg font-bold tabular-nums text-text-primary">{soles(p.unit_price)}</span>
                  <StockBadge stock={p.stock_on_hand} reorderPoint={p.reorder_point} compact />
                </div>
              </div>
            </button>
          ))}
        </div>
      </DataState>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} size="lg">
        {selected && <ProductDetailCard product={selected} fieldLabels={labels} inCart={0} />}
      </Modal>
    </div>
  );
}
