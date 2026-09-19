"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { CartLine, lineGross, lineTotal, toNumber } from "./cart";
import { ProductThumb } from "./ProductThumb";

interface Props {
  lines: CartLine[];
  onQuantity: (productId: string, quantity: number) => void;
  onPrice: (productId: string, value: string) => void;
  onDiscount: (productId: string, value: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}

const miniInput =
  "w-full rounded-lg border border-border bg-surface-soft px-2 py-1 text-right text-sm tabular-nums text-text-primary transition-all focus:border-primary/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10";

export function CartPanel({ lines, onQuantity, onPrice, onDiscount, onRemove, onClear }: Props) {
  const units = lines.reduce((a, l) => a + l.quantity, 0);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold text-text-primary">Carrito</h2>
          {lines.length > 0 && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
              {lines.length} ítem{lines.length === 1 ? "" : "s"} · {units} uds
            </span>
          )}
        </div>
        {lines.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs font-medium text-text-muted hover:text-danger">
            Vaciar
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="mx-5 mb-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
          <ShoppingCart className="h-7 w-7 text-text-muted" strokeWidth={1.5} />
          <p className="text-sm text-text-secondary">El carrito está vacío</p>
          <p className="text-xs text-text-muted">Escanea o busca productos para agregarlos.</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border-soft overflow-y-auto px-5">
          {lines.map((line) => {
            const p = line.product;
            const atMax = line.quantity >= p.stock_on_hand;
            const discountInvalid = toNumber(line.discount) > lineGross(line);
            return (
              <li key={p.id} className="py-3 animate-fade-up">
                <div className="flex gap-3">
                  <ProductThumb src={p.image_url} name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary" title={p.name}>{p.name}</p>
                        <p className="text-[11px] text-text-muted">Quedan {p.stock_on_hand}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(p.id)}
                        aria-label={`Quitar ${p.name}`}
                        className="rounded-lg p-1 text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-[auto_1fr_1fr] items-end gap-2">
                      <div>
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Cant.</span>
                        <div className="flex items-center rounded-lg border border-border bg-surface-soft">
                          <button
                            type="button"
                            onClick={() => onQuantity(p.id, line.quantity - 1)}
                            className="grid h-7 w-7 place-items-center text-text-secondary hover:text-text-primary"
                            aria-label="Restar"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            value={line.quantity}
                            inputMode="numeric"
                            onChange={(e) => {
                              const n = parseInt(e.target.value.replace(/\D/g, "") || "0", 10);
                              onQuantity(p.id, n);
                            }}
                            className="h-7 w-9 bg-transparent text-center text-sm font-semibold tabular-nums text-text-primary focus:outline-none"
                            aria-label="Cantidad"
                          />
                          <button
                            type="button"
                            onClick={() => onQuantity(p.id, line.quantity + 1)}
                            className={cn(
                              "grid h-7 w-7 place-items-center hover:text-text-primary",
                              atMax ? "text-text-muted/50" : "text-text-secondary",
                            )}
                            aria-label="Sumar"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <label>
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Precio</span>
                        <input
                          value={line.unitPrice}
                          inputMode="decimal"
                          onChange={(e) => onPrice(p.id, e.target.value.replace(/[^\d.,]/g, ""))}
                          className={miniInput}
                          aria-label="Precio unitario"
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">Descuento S/</span>
                        <input
                          value={line.discount}
                          inputMode="decimal"
                          placeholder="0.00"
                          onChange={(e) => onDiscount(p.id, e.target.value.replace(/[^\d.,]/g, ""))}
                          className={cn(miniInput, discountInvalid && "border-danger/50 text-danger")}
                          aria-label="Descuento de la línea"
                        />
                      </label>
                    </div>
                    <p className="mt-1.5 text-right text-sm font-semibold tabular-nums text-text-primary">
                      {toNumber(line.discount) > 0 && (
                        <span className="mr-2 text-xs font-normal text-text-muted line-through">{soles(lineGross(line))}</span>
                      )}
                      {soles(lineTotal(line))}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
