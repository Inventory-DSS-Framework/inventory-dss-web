"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardCheck, Minus, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ProductThumb } from "@/components/products/ProductThumb";
import { cn } from "@/lib/utils";
import { inputClass } from "@/lib/ui";
import { stockApi } from "@/lib/apis/inventory";
import {
  ADJUSTMENT_REASON_LABEL,
  type AdjustmentMode,
  type AdjustmentReason,
  type AdjustmentResult,
} from "@/types/inventory";

export interface AdjustableProduct {
  id: string;
  name: string;
  sku: string;
  stock_on_hand: number;
  image_url?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  products: AdjustableProduct[];
  /** Fixes the product (e.g. from the product page). */
  productId?: string | null;
  onDone: (result: AdjustmentResult) => void;
}

const REASONS: { value: AdjustmentReason; hint: string }[] = [
  { value: "conteo", hint: "Cuadrar con lo que hay en tienda" },
  { value: "merma", hint: "Producto dañado o roto" },
  { value: "vencido", hint: "Pasó su fecha de vencimiento" },
  { value: "robo", hint: "Faltante sin explicación" },
  { value: "otro", hint: "Cualquier otra corrección" },
];

const ONLY_REDUCES: AdjustmentReason[] = ["merma", "robo", "vencido"];

export function StockAdjustmentModal({ open, onClose, companyId, products, productId, onDone }: Props) {
  const [selected, setSelected] = useState<string>("");
  const [mode, setMode] = useState<AdjustmentMode>("set");
  const [direction, setDirection] = useState<1 | -1>(-1);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("conteo");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(productId ?? "");
    setMode("set");
    setDirection(-1);
    setQuantity("");
    setReason("conteo");
    setNote("");
    setError(null);
  }, [open, productId]);

  const product = products.find((p) => p.id === selected) ?? null;
  const options = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.name,
        description: `Tienes ${p.stock_on_hand}`,
      })),
    [products],
  );

  const qty = quantity === "" ? null : Number(quantity);
  const validQty = qty !== null && Number.isInteger(qty) && qty >= 0;
  const current = product?.stock_on_hand ?? 0;
  const delta = !validQty ? null : mode === "set" ? qty - current : direction * qty;
  const next = delta === null ? null : current + delta;

  let problem: string | null = null;
  if (!product) problem = "Elige un producto";
  else if (!validQty) problem = "Indica una cantidad entera";
  else if (mode === "delta" && qty === 0) problem = "Indica cuántas unidades";
  else if (next !== null && next < 0) problem = `No puedes dejar el stock en negativo (hay ${current})`;
  else if (delta !== null && delta > 0 && ONLY_REDUCES.includes(reason))
    problem = `${ADJUSTMENT_REASON_LABEL[reason]} solo puede reducir el stock`;

  const pickReason = (r: AdjustmentReason) => {
    setReason(r);
    if (ONLY_REDUCES.includes(r)) {
      setMode("delta");
      setDirection(-1);
    }
  };

  const submit = async () => {
    if (!companyId || !product || problem || qty === null) return;
    setSaving(true);
    setError(null);
    try {
      const result = await stockApi.adjust(companyId, {
        product_id: product.id,
        mode,
        quantity: mode === "set" ? qty : direction * qty,
        reason,
        note: note.trim() || undefined,
      });
      onDone(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la corrección.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Corregir stock"
      description="Úsalo cuando contaste y no cuadra, o si algo se dañó, venció o se perdió."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving} disabled={!!problem || saving || delta === 0}>
            <ClipboardCheck className="h-4 w-4" />
            Guardar corrección
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}

        {productId && product ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft px-4 py-3">
            <ProductThumb src={product.image_url} name={product.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{product.name}</p>
              <p className="text-xs text-text-muted">Ahora tienes {product.stock_on_hand}</p>
            </div>
          </div>
        ) : (
          <div>
            <Label>Producto</Label>
            <Select value={selected} options={options} onChange={setSelected} searchable placeholder="Busca el producto por nombre" />
          </div>
        )}

        <div>
          <Label>¿Qué pasó?</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                title={r.hint}
                onClick={() => pickReason(r.value)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors",
                  reason === r.value
                    ? "border-primary/30 bg-primary-soft text-primary"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-soft",
                )}
              >
                {ADJUSTMENT_REASON_LABEL[r.value]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>¿Cómo quieres corregir?</Label>
          <div className="inline-flex rounded-xl border border-border bg-surface-soft p-1">
            {(
              [
                { v: "set", label: "Conté y hay…" },
                { v: "delta", label: "Sumar o restar" },
              ] as const
            ).map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => setMode(m.v)}
                disabled={m.v === "set" && ONLY_REDUCES.includes(reason)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
                  mode === m.v ? "bg-surface text-text-primary shadow-soft" : "text-text-muted hover:text-text-primary",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>{mode === "set" ? "¿Cuántas unidades contaste?" : "Unidades"}</Label>
            <div className="flex gap-2">
              {mode === "delta" && (
                <div className="flex rounded-xl border border-border bg-surface-soft p-1">
                  <button
                    type="button"
                    aria-label="Restar"
                    onClick={() => setDirection(-1)}
                    className={cn("grid h-8 w-9 place-items-center rounded-lg", direction === -1 ? "bg-danger-soft text-danger" : "text-text-muted")}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Sumar"
                    disabled={ONLY_REDUCES.includes(reason)}
                    onClick={() => setDirection(1)}
                    className={cn("grid h-8 w-9 place-items-center rounded-lg disabled:opacity-30", direction === 1 ? "bg-success-soft text-success" : "text-text-muted")}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass(false, "tabular-nums")}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                autoFocus={!!productId}
              />
            </div>
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2">
              <Stat label="Ahora" value={product ? current : "—"} />
              <ArrowRight className="h-4 w-4 text-text-muted" />
              <Stat
                label="Quedará"
                value={next ?? "—"}
                tone={delta === null || delta === 0 ? undefined : delta > 0 ? "success" : "danger"}
                suffix={delta ? `${delta > 0 ? "+" : ""}${delta}` : undefined}
              />
            </div>
          </div>
        </div>

        <div>
          <Label>Nota (opcional)</Label>
          <input className={inputClass()} value={note} maxLength={180} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Bolsa rota en almacén" />
        </div>

        {problem && product && quantity !== "" && <p className="text-xs text-warning">{problem}</p>}
      </div>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">{children}</span>;
}

function Stat({ label, value, tone, suffix }: { label: string; value: number | string; tone?: "success" | "danger"; suffix?: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={cn("font-display text-lg font-bold tabular-nums", tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text-primary")}>
        {value}
        {suffix && <span className="ml-1 text-xs font-semibold">({suffix})</span>}
      </p>
    </div>
  );
}
