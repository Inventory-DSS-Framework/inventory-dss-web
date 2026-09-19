"use client";

import { Barcode, Layers, Plus, ScanLine, Tag } from "lucide-react";
import { soles } from "@/lib/ui";
import type { CatalogProduct } from "@/types/pos";
import { ProductThumb } from "./ProductThumb";
import { StockBadge } from "./StockBadge";

function formatAttr(v: string | number | boolean | null): string {
  if (v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}

/** "Producto seleccionado": everything the cashier needs to confirm it's the right item. */
export function ProductDetailCard({
  product,
  fieldLabels,
  inCart,
  onAdd,
}: {
  product: CatalogProduct | null;
  fieldLabels: Record<string, string>;
  inCart: number;
  /** Omit for a read-only card (stock lookup). */
  onAdd?: (product: CatalogProduct) => void;
}) {
  if (!product) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-surface/60 p-8 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <ScanLine className="h-6 w-6" />
        </div>
        <p className="font-display text-base font-semibold text-text-primary">Escanea un producto para empezar</p>
        <p className="max-w-sm text-sm text-text-secondary">
          Aquí verás su foto, precio, stock y atributos para confirmar que es el artículo correcto.
        </p>
      </div>
    );
  }

  const attrs = Object.entries(product.custom_attributes ?? {}).filter(([, v]) => v !== null && v !== "");
  const available = product.stock_on_hand - inCart;

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft animate-fade-up">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Producto seleccionado</p>
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        <div className="aspect-square w-full max-w-[200px]">
          <ProductThumb src={product.image_url} name={product.name} size="lg" />
        </div>
        <div className="min-w-0 space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold leading-snug text-text-primary">{product.name}</h2>
            {product.description && <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{product.description}</p>}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Precio (inc. IGV)</p>
              <p className="font-display text-3xl font-bold tabular-nums text-text-primary">{soles(product.unit_price)}</p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Stock</p>
              <StockBadge stock={product.stock_on_hand} reorderPoint={product.reorder_point} />
              {inCart > 0 && (
                <p className="mt-1 text-xs text-text-muted">
                  {inCart} en el carrito · quedan {Math.max(available, 0)}
                </p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <Info icon={Tag} label="Código" value={product.sku} mono />
            <Info icon={Barcode} label="Código de barras" value={product.barcode || "—"} mono />
            <Info icon={Layers} label="Categoría" value={product.category_name || "Sin marca"} />
            <Info icon={Tag} label="Unidad" value={product.unit_of_measure === "unit" ? "Unidad" : product.unit_of_measure} />
          </dl>

          {attrs.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border-soft pt-3">
              {attrs.map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-soft px-2.5 py-1 text-xs">
                  <span className="text-text-muted">{fieldLabels[key] ?? key}:</span>
                  <span className="font-medium text-text-primary">{formatAttr(value)}</span>
                </span>
              ))}
            </div>
          )}

          {onAdd && (
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={available <= 0}
              className="btn btn-secondary w-full gap-2 py-2.5 text-sm disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> {available <= 0 ? "Sin stock disponible" : "Agregar otra unidad"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Tag;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className={mono ? "truncate font-mono text-[13px] text-text-primary" : "truncate text-text-primary"}>{value}</dd>
    </div>
  );
}
