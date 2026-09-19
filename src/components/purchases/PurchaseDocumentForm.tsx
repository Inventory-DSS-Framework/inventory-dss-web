"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, CheckCircle2, FileText, History, Loader2, PackagePlus, Plus, Sparkles, Trash2, UserPlus, X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Table";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { inputClass, soles } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { purchasingApi } from "@/lib/apis/purchasing";
import type { SupplierDTO } from "@/types/api";
import type { PurchaseBatchItemInput, PurchaseBatchResultDTO, PurchaseCatalogItemDTO } from "@/types/purchasing";
import { PurchaseDocumentModal } from "./PurchaseDocumentModal";
import { IGV_RATE, fmtPct, fmtQty, num, round2, todayISO, weightedAverage } from "./format";

interface Props {
  companyId: string | null;
  suppliers: SupplierDTO[];
  catalog: PurchaseCatalogItemDTO[];
  initialSupplierId?: string | null;
  onSuppliersChanged: () => void;
  onRegistered: () => void;
}

type Line = {
  uid: string;
  mode: "existing" | "new";
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  quantity: string;
  unitCost: string;
};

let seq = 0;
const newLine = (mode: Line["mode"] = "existing"): Line => ({
  uid: `l${++seq}`,
  mode,
  productId: "",
  name: "",
  sku: "",
  barcode: "",
  price: "",
  quantity: "1",
  unitCost: "",
});

export function PurchaseDocumentForm({ companyId, suppliers, catalog, initialSupplierId, onSuppliersChanged, onRegistered }: Props) {
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [docNumber, setDocNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [includeIgv, setIncludeIgv] = useState(false);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [result, setResult] = useState<PurchaseBatchResultDTO | null>(null);
  const [supplierModal, setSupplierModal] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  useEffect(() => {
    if (initialSupplierId && suppliers.some((s) => s.id === initialSupplierId)) setSupplierId(initialSupplierId);
  }, [initialSupplierId, suppliers]);

  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);

  const supplierOptions: SelectOption[] = suppliers
    .filter((s) => s.is_active || s.id === supplierId)
    .map((s) => ({ value: s.id, label: s.business_name, description: `RUC ${s.ruc}` }));

  const productOptions = (current: string): SelectOption[] => {
    const taken = new Set(lines.map((l) => l.productId).filter((id) => id && id !== current));
    return catalog
      .filter((p) => p.is_active || p.id === current)
      .map((p) => ({
        value: p.id,
        label: p.name,
        description: `${p.sku}${p.barcode ? ` · ${p.barcode}` : ""} · Stock ${fmtQty(p.stock_on_hand)} · Costo prom. ${soles(p.unit_cost)}`,
        disabled: taken.has(p.id),
      }));
  };

  const update = (uid: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));

  const pickProduct = (uid: string, productId: string) => {
    const p = byId.get(productId);
    const base = p ? num(p.last_cost ?? p.unit_cost) : 0;
    const cost = base > 0 ? String(round2(includeIgv ? base * (1 + IGV_RATE) : base)) : "";
    update(uid, { productId, unitCost: cost });
  };

  const toNet = (typed: number) => (includeIgv ? typed / (1 + IGV_RATE) : typed);

  const computed = lines.map((l) => {
    const qty = Number(l.quantity);
    const cost = Number(l.unitCost);
    const qtyOk = Number.isInteger(qty) && qty > 0;
    const costOk = l.unitCost.trim() !== "" && Number.isFinite(cost) && cost >= 0;
    const product = l.mode === "existing" ? byId.get(l.productId) : undefined;
    const productOk = l.mode === "existing" ? !!product : l.name.trim().length > 0;
    const net = costOk ? toNet(cost) : 0;
    const stock = product?.stock_on_hand ?? 0;
    const avg = num(product?.unit_cost);
    const newAvg = qtyOk && costOk ? weightedAverage(stock, avg, qty, round2(net)) : null;
    const salePrice = l.mode === "existing" ? num(product?.unit_price) : Number(l.price) || 0;
    const saleNet = salePrice / (1 + IGV_RATE);
    const costForMargin = newAvg ?? (costOk ? net : null);
    const margin = saleNet > 0 && costForMargin !== null ? (saleNet - costForMargin) / saleNet : null;
    const lineTotal = qtyOk && costOk ? qty * cost : 0;
    return { line: l, qty, qtyOk, costOk, product, productOk, stock, avg, newAvg, margin, lineTotal, valid: qtyOk && costOk && productOk };
  });

  const typedTotal = computed.reduce((a, c) => a + c.lineTotal, 0);
  const subtotal = includeIgv ? typedTotal / (1 + IGV_RATE) : typedTotal;
  const igv = subtotal * IGV_RATE;
  const total = subtotal + igv;
  const units = computed.reduce((a, c) => a + (c.qtyOk ? c.qty : 0), 0);
  const allValid = computed.every((c) => c.valid);
  const canSubmit = !!companyId && !!supplierId && !!date && lines.length > 0 && allValid && !saving;

  const submit = async () => {
    setAttempted(true);
    if (!canSubmit || !companyId) {
      if (!supplierId) setError("Elige el proveedor del comprobante.");
      else if (!allValid) setError("Revisa las líneas marcadas: falta el producto, la cantidad o el costo.");
      return;
    }
    setSaving(true);
    setError(null);
    const items: PurchaseBatchItemInput[] = lines.map((l) =>
      l.mode === "existing"
        ? { product_id: l.productId, quantity: Number(l.quantity), unit_cost: Number(l.unitCost) }
        : {
            new_product: {
              name: l.name.trim(),
              sku: l.sku.trim() || null,
              barcode: l.barcode.trim() || null,
              unit_price: l.price.trim() ? Number(l.price) : null,
            },
            quantity: Number(l.quantity),
            unit_cost: Number(l.unitCost),
          },
    );
    try {
      const res = await purchasingApi.registerDocument(companyId, {
        supplier_id: supplierId,
        purchase_date: date,
        document_number: docNumber.trim(),
        notes: notes.trim(),
        costs_include_igv: includeIgv,
        items,
      });
      setResult(res);
      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la compra.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setResult(null);
    setLines([newLine()]);
    setDocNumber("");
    setNotes("");
    setAttempted(false);
    setError(null);
  };

  const supplier = suppliers.find((s) => s.id === supplierId);

  if (result) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-text-primary">Compra registrada</h2>
          <p className="text-sm text-text-secondary">
            {result.document_number ? `Comprobante ${result.document_number}` : "Compra sin N° de comprobante"} · {supplier?.business_name} ·{" "}
            ingresaron <strong className="text-text-primary">{fmtQty(result.units)} unidades</strong> por{" "}
            <strong className="text-text-primary">{soles(result.total)}</strong> (IGV incl.)
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft/60">
                {["Producto", "Ingreso", "Stock", "Costo promedio"].map((h, i) => (
                  <th key={h} className={cn("whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted", i > 0 && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {result.stock_changes.map((c) => {
                const isNew = result.new_products.some((n) => n.product_id === c.product_id);
                return (
                  <tr key={c.product_id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/inventory/${c.product_id}`} className="font-medium text-text-primary hover:text-primary">{c.name}</Link>
                      <span className="ml-2 font-mono text-[11px] text-text-muted">{c.sku}</span>
                      {isNew && <span className="ml-2"><Badge variant="violet">Nuevo</Badge></span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-success">+{fmtQty(c.quantity)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">
                      {fmtQty(c.previous_stock)} <ArrowRight className="inline h-3 w-3" /> <span className="font-medium text-text-primary">{fmtQty(c.new_stock)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">
                      {soles(c.previous_avg_cost)} <ArrowRight className="inline h-3 w-3" /> <span className="font-medium text-text-primary">{soles(c.new_avg_cost)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => setDocOpen(true)}>
            <FileText className="h-4 w-4" /> Ver documento
          </Button>
          <Link href="/purchases" className="btn btn-secondary h-10 gap-2 px-4 text-sm">
            <History className="h-4 w-4" /> Historial de compras
          </Link>
          <Button onClick={reset}>
            <Plus className="h-4 w-4" /> Registrar otra compra
          </Button>
        </div>
        <PurchaseDocumentModal open={docOpen} onClose={() => setDocOpen(false)} companyId={companyId} documentId={result.batch_id} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document header */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-display text-[15px] font-semibold text-text-primary">Comprobante del proveedor</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
          <Field label="Proveedor" required>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  value={supplierId}
                  onChange={setSupplierId}
                  options={supplierOptions}
                  searchable
                  placeholder={suppliers.length ? "Busca por razón social o RUC…" : "Aún no tienes proveedores"}
                  invalid={attempted && !supplierId}
                  emptyText="Ningún proveedor coincide"
                />
              </div>
              <Button variant="secondary" onClick={() => setSupplierModal(true)} title="Nuevo proveedor" className="shrink-0">
                <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo</span>
              </Button>
            </div>
          </Field>
          <Field label="Fecha de emisión" required>
            <input type="date" className={inputClass(attempted && !date)} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="N° comprobante">
            <input className={inputClass(false, "font-mono")} value={docNumber} onChange={(e) => setDocNumber(e.target.value.toUpperCase())} placeholder="F001-000123" maxLength={40} />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <Field label="Notas">
            <input className={inputClass()} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional: condiciones, guía de remisión…" maxLength={500} />
          </Field>
          <button
            type="button"
            role="switch"
            aria-checked={includeIgv}
            onClick={() => setIncludeIgv((v) => !v)}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors",
              includeIgv ? "border-primary/30 bg-primary-softer" : "border-border bg-surface-soft",
            )}
          >
            <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", includeIgv ? "bg-primary" : "bg-surface-muted")}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-soft transition-all", includeIgv ? "left-[18px]" : "left-0.5")} />
            </span>
            <span>
              <span className="block font-medium text-text-primary">Los costos incluyen IGV</span>
              <span className="block text-[11px] text-text-muted">Guardamos el costo sin IGV (÷ 1.18)</span>
            </span>
          </button>
        </div>
      </Card>

      {/* Lines */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="font-display text-[15px] font-semibold text-text-primary">Productos del comprobante</h3>
            <p className="text-xs text-text-muted">
              Costo unitario {includeIgv ? "con IGV" : "sin IGV"} · vemos cómo cambia tu costo promedio y tu margen
            </p>
          </div>
          <span className="text-xs text-text-muted tabular-nums">{lines.length} {lines.length === 1 ? "línea" : "líneas"}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft/60">
                <Th className="w-8">#</Th>
                <Th>Producto</Th>
                <Th className="w-28 text-right">Cantidad</Th>
                <Th className="w-36 text-right">Costo unit.</Th>
                <Th className="w-48 text-right">Costo promedio</Th>
                <Th className="w-24 text-right">Margen</Th>
                <Th className="w-32 text-right">Subtotal</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {computed.map((c, i) => {
                const l = c.line;
                const showErr = attempted && !c.valid;
                return (
                  <tr key={l.uid} className={cn("align-top", showErr && "bg-danger-soft/20", l.mode === "new" && "bg-accent-violet-soft/20")}>
                    <td className="px-4 pt-5 text-xs text-text-muted tabular-nums">{i + 1}</td>
                    <td className="px-3 py-3">
                      {l.mode === "existing" ? (
                        <div className="space-y-1.5">
                          <Select
                            value={l.productId}
                            onChange={(v) => pickProduct(l.uid, v)}
                            options={productOptions(l.productId)}
                            searchable
                            placeholder="Busca por nombre, código o código de barras…"
                            invalid={attempted && !c.productOk}
                            emptyText="No está en tu catálogo — usa “Producto nuevo”"
                          />
                          {c.product && (
                            <p className="px-1 text-[11px] text-text-muted">
                              <span className="font-mono">{c.product.sku}</span> · Stock actual{" "}
                              <span className="font-medium text-text-secondary">{fmtQty(c.stock)}</span>
                              {c.qtyOk && <> → <span className="font-medium text-success">{fmtQty(c.stock + c.qty)}</span></>}
                              {num(c.product.unit_price) > 0 && <> · Venta {soles(c.product.unit_price)}</>}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="violet">Producto nuevo</Badge>
                            <button type="button" onClick={() => update(l.uid, { mode: "existing" })} className="text-[11px] font-medium text-text-muted hover:text-text-primary">
                              Elegir del catálogo
                            </button>
                          </div>
                          <input className={inputClass(attempted && !c.productOk, "py-2")} placeholder="Nombre del producto *" value={l.name} onChange={(e) => update(l.uid, { name: e.target.value })} autoFocus />
                          <div className="grid grid-cols-3 gap-2">
                            <input className={inputClass(false, "py-1.5 text-xs font-mono")} placeholder="Código (auto)" value={l.sku} onChange={(e) => update(l.uid, { sku: e.target.value.toUpperCase() })} title="Si lo dejas vacío asignamos el correlativo P-000123" />
                            <input className={inputClass(false, "py-1.5 text-xs")} placeholder="Cód. barras" value={l.barcode} onChange={(e) => update(l.uid, { barcode: e.target.value })} />
                            <input type="number" min="0" step="0.01" className={inputClass(false, "py-1.5 text-xs")} placeholder="Precio venta" value={l.price} onChange={(e) => update(l.uid, { price: e.target.value })} />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <input type="number" min="1" step="1" className={inputClass(attempted && !c.qtyOk, "text-right tabular-nums")} value={l.quantity} onChange={(e) => update(l.uid, { quantity: e.target.value })} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">S/</span>
                        <input type="number" min="0" step="0.01" className={inputClass(attempted && !c.costOk, "pl-8 text-right tabular-nums")} value={l.unitCost} onChange={(e) => update(l.uid, { unitCost: e.target.value })} placeholder="0.00" />
                      </div>
                      {includeIgv && c.costOk && <p className="mt-1 text-right text-[11px] text-text-muted">sin IGV {soles(toNet(Number(l.unitCost)))}</p>}
                    </td>
                    <td className="px-4 pt-5 text-right text-[13px] tabular-nums">
                      {c.newAvg === null ? (
                        <span className="text-text-muted">—</span>
                      ) : l.mode === "existing" && c.product ? (
                        <span className="whitespace-nowrap">
                          <span className="text-text-muted">{soles(c.avg)}</span>
                          <ArrowRight className="mx-1 inline h-3 w-3 text-text-muted" />
                          <span className={cn("font-semibold", c.newAvg > c.avg + 0.004 ? "text-warning" : c.newAvg < c.avg - 0.004 ? "text-success" : "text-text-primary")}>
                            {soles(c.newAvg)}
                          </span>
                        </span>
                      ) : (
                        <span className="font-semibold text-text-primary">{soles(c.newAvg)}</span>
                      )}
                    </td>
                    <td className="px-4 pt-5 text-right text-[13px] tabular-nums" title="Sobre el precio de venta sin IGV">
                      {c.margin === null ? (
                        <span className="text-text-muted">—</span>
                      ) : (
                        <span className={cn("font-semibold", c.margin < 0 ? "text-danger" : c.margin < 0.15 ? "text-warning" : "text-success")}>{fmtPct(c.margin)}</span>
                      )}
                    </td>
                    <td className="px-4 pt-5 text-right font-semibold tabular-nums text-text-primary">{soles(c.lineTotal)}</td>
                    <td className="px-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setLines((ls) => (ls.length === 1 ? [newLine()] : ls.filter((x) => x.uid !== l.uid)))}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger"
                        aria-label="Quitar línea"
                      >
                        {lines.length === 1 ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-5 border-t border-border px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setLines((ls) => [...ls, newLine()])}>
              <Plus className="h-3.5 w-3.5" /> Agregar producto
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLines((ls) => [...ls, newLine("new")])} className="text-accent-violet">
              <Sparkles className="h-3.5 w-3.5" /> Producto nuevo
            </Button>
          </div>
          <div className="w-full max-w-sm space-y-1.5 text-sm">
            <Row label={`Unidades`} value={fmtQty(units)} />
            <Row label="Subtotal (sin IGV)" value={soles(subtotal)} />
            <Row label="IGV 18%" value={soles(igv)} />
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="font-display text-xl font-semibold tabular-nums text-text-primary">{soles(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-muted">
          Al registrar, el stock sube y el costo promedio ponderado de cada producto se recalcula automáticamente.
        </p>
        <Button size="lg" onClick={submit} disabled={saving || !companyId}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
          {saving ? "Registrando…" : `Registrar compra · ${soles(total)}`}
        </Button>
      </div>

      <SupplierFormModal
        open={supplierModal}
        onClose={() => setSupplierModal(false)}
        companyId={companyId}
        supplier={null}
        allowDelete={false}
        onSaved={(saved) => {
          onSuppliersChanged();
          if (saved) setSupplierId(saved.id);
        }}
      />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted", className)}>{children}</th>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="tabular-nums text-text-primary">{value}</span>
    </div>
  );
}
