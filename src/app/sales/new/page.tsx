"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, ListOrdered, Loader2, PackageSearch, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useProfile } from "@/hooks/useProfile";
import { customFieldsApi } from "@/lib/apis/custom-fields";
import { CheckoutError, lostSalesApi, posApi } from "@/lib/apis/pos";
import type { CatalogProduct, PaymentMethod, SalesDocumentType, SalesOrder } from "@/types/pos";
import { ProductSearch } from "@/components/pos/ProductSearch";
import { CameraScannerModal } from "@/components/pos/CameraScannerModal";
import { ProductDetailCard } from "@/components/pos/ProductDetailCard";
import { CartPanel } from "@/components/pos/CartPanel";
import { ClientData, DocumentClientForm, clientDocType, clientError } from "@/components/pos/DocumentClientForm";
import { PaymentSelector } from "@/components/pos/PaymentSelector";
import { CartLine, cartTotals, lineGross, newLine, toNumber } from "@/components/pos/cart";
import { ReceiptPreview } from "@/components/invoicing/ReceiptPreview";

type Notice = { tone: "danger" | "warning" | "success"; text: string } | null;

const EMPTY_CLIENT: ClientData = { docNumber: "", name: "", address: "" };

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export default function NewSalePage() {
  const companyId = useCompanyId();
  const { user, company } = useProfile();
  const now = useClock();
  const searchRef = useRef<HTMLInputElement>(null);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [doc, setDoc] = useState<SalesDocumentType>("boleta");
  const [client, setClient] = useState<ClientData>(EMPTY_CLIENT);
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [received, setReceived] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SalesOrder | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const fields = useApi(
    () => (companyId ? customFieldsApi.list(companyId, "product") : Promise.resolve([])),
    [companyId],
  );
  const fieldLabels = useMemo(
    () => Object.fromEntries((fields.data ?? []).map((f) => [f.key, f.label])),
    [fields.data],
  );

  const totals = useMemo(() => cartTotals(lines), [lines]);

  // Auto-dismiss success/warning notices; keep errors until the next action.
  useEffect(() => {
    if (!notice || notice.tone === "danger") return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const recordLost = useCallback(
    (product: CatalogProduct, requested: number) => {
      if (!companyId) return;
      lostSalesApi
        .record(companyId, {
          product_id: product.id,
          requested_quantity: requested,
          available_quantity: Math.max(product.stock_on_hand, 0),
        })
        .catch(() => undefined);
    },
    [companyId],
  );

  const blockForStock = useCallback(
    (product: CatalogProduct, requested: number) => {
      setNotice({
        tone: "danger",
        text:
          product.stock_on_hand <= 0
            ? `«${product.name}» no tiene stock. Se registró como venta perdida.`
            : `Solo hay ${product.stock_on_hand} uds de «${product.name}» (pediste ${requested}). Se registró como venta perdida.`,
      });
      recordLost(product, requested);
    },
    [recordLost],
  );

  const addProduct = useCallback(
    (product: CatalogProduct) => {
      setSelected(product);
      setLines((prev) => {
        const existing = prev.find((l) => l.product.id === product.id);
        const requested = (existing?.quantity ?? 0) + 1;
        if (requested > product.stock_on_hand) {
          blockForStock(product, requested);
          // still refresh the stock snapshot of the line
          return existing ? prev.map((l) => (l.product.id === product.id ? { ...l, product } : l)) : prev;
        }
        setNotice(null);
        if (existing) {
          return prev.map((l) => (l.product.id === product.id ? { ...l, product, quantity: requested } : l));
        }
        return [newLine(product), ...prev];
      });
    },
    [blockForStock],
  );

  const setQuantity = (productId: string, quantity: number) => {
    const line = lines.find((l) => l.product.id === productId);
    if (!line) return;
    if (quantity <= 0) {
      setLines((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    if (quantity > line.product.stock_on_hand) {
      blockForStock(line.product, quantity);
      return;
    }
    setNotice(null);
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  };

  const patchLine = (productId: string, patch: Partial<CartLine>) =>
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, ...patch } : l)));

  const resetTill = useCallback(() => {
    setLines([]);
    setSelected(null);
    setClient(EMPTY_CLIENT);
    setDoc("boleta");
    setPayment("efectivo");
    setReceived("");
    setNotice(null);
    setReceipt(null);
    window.setTimeout(() => searchRef.current?.focus(), 30);
  }, []);

  const problem = useMemo((): string | null => {
    if (!lines.length) return "Agrega productos al carrito.";
    for (const l of lines) {
      const price = String(l.unitPrice).trim();
      if (price === "" || !Number.isFinite(Number(price.replace(",", "."))))
        return `Revisa el precio de «${l.product.name}».`;
      if (toNumber(l.discount) > lineGross(l)) return `El descuento de «${l.product.name}» supera el importe.`;
    }
    const clientProblem = clientError(doc, client, totals.total);
    if (clientProblem) return clientProblem;
    if (payment === "efectivo" && received !== "" && toNumber(received) < totals.total)
      return "El monto recibido es menor al total.";
    return null;
  }, [lines, doc, client, payment, received, totals.total]);

  const checkout = useCallback(async () => {
    if (!companyId || submitting) return;
    if (problem) {
      setNotice({ tone: "danger", text: problem });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const order = await posApi.checkout(companyId, {
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: toNumber(l.unitPrice),
          discount: toNumber(l.discount),
        })),
        document_type: doc,
        client_doc_type: clientDocType(doc, client.docNumber),
        client_doc_number: client.docNumber.trim(),
        client_name: client.name.trim(),
        client_address: doc === "factura" ? client.address.trim() : "",
        payment_method: payment,
        amount_received: payment === "efectivo" && received !== "" ? toNumber(received) : null,
      });
      setReceipt(order);
    } catch (err) {
      if (err instanceof CheckoutError && err.status === 409 && err.shortages.length) {
        // Someone else sold those units meanwhile: sync stock and log the lost sales.
        setLines((prev) =>
          prev.map((l) => {
            const s = err.shortages.find((x) => x.product_id === l.product.id);
            return s ? { ...l, product: { ...l.product, stock_on_hand: s.available } } : l;
          }),
        );
        err.shortages.forEach((s) => {
          const line = lines.find((l) => l.product.id === s.product_id);
          if (line) recordLost({ ...line.product, stock_on_hand: s.available }, s.requested);
        });
        setNotice({
          tone: "danger",
          text: `Stock insuficiente: ${err.shortages.map((s) => `${s.name} (disponible ${s.available})`).join(", ")}. Ajusta las cantidades.`,
        });
      } else {
        setNotice({ tone: "danger", text: err instanceof Error ? err.message : "No se pudo registrar la venta." });
      }
    } finally {
      setSubmitting(false);
    }
  }, [companyId, submitting, problem, lines, doc, client, payment, received, recordLost]);

  // Keyboard shortcuts: F2 scanner, F9 cobrar, Esc back to scanner.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (receipt || cameraOpen) return;
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "F9") {
        e.preventDefault();
        void checkout();
      } else if (e.key === "Escape" && document.activeElement !== searchRef.current) {
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [checkout, receipt, cameraOpen]);

  const onCameraDetected = useCallback(
    async (code: string) => {
      setCameraOpen(false);
      if (!companyId) return;
      try {
        addProduct(await posApi.lookup(companyId, code));
      } catch {
        setNotice({ tone: "warning", text: `No encontramos un producto con el código «${code}».` });
      }
      window.setTimeout(() => searchRef.current?.focus(), 50);
    },
    [companyId, addProduct],
  );

  const inCartSelected = selected ? lines.find((l) => l.product.id === selected.id)?.quantity ?? 0 : 0;
  const dateLabel = now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Lima" });
  const timeLabel = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* Header: who is selling and when (automatic, not editable) */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Punto de venta</p>
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-text-primary">Nueva venta</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-text-secondary">
            <UserRound className="h-4 w-4 text-primary" />
            <span className="font-medium text-text-primary">{user?.full_name ?? "—"}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 capitalize text-text-secondary">
            <CalendarClock className="h-4 w-4 text-primary" />
            {dateLabel} · <span className="font-semibold tabular-nums text-text-primary">{timeLabel}</span>
          </span>
          <Link href="/sales" className="btn btn-ghost gap-1.5 px-3 py-2 text-sm">
            <ListOrdered className="h-4 w-4" /> Ventas
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left: scanner + product detail */}
        <div className="space-y-4">
          <ProductSearch
            companyId={companyId}
            inputRef={searchRef}
            onPick={addProduct}
            onOpenCamera={() => setCameraOpen(true)}
          />

          {notice && (
            <div
              role="alert"
              className={cn(
                "flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm animate-fade-up",
                notice.tone === "danger" && "border-danger/25 bg-danger-soft text-danger",
                notice.tone === "warning" && "border-warning/25 bg-warning-soft text-warning",
                notice.tone === "success" && "border-success/25 bg-success-soft text-success",
              )}
            >
              {notice.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className="flex-1">{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <ProductDetailCard product={selected} fieldLabels={fieldLabels} inCart={inCartSelected} onAdd={addProduct} />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-xs text-text-muted">
            <span><Kbd>F2</Kbd> Buscar / escanear</span>
            <span><Kbd>Enter</Kbd> Agregar</span>
            <span><Kbd>F9</Kbd> Cobrar</span>
            <span><Kbd>Esc</Kbd> Limpiar búsqueda</span>
            <Link href="/sales/stock" className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:text-primary-hover">
              <PackageSearch className="h-3.5 w-3.5" /> Consultar productos
            </Link>
          </div>
        </div>

        {/* Right: sticky cart + checkout */}
        <aside className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-soft lg:sticky lg:top-0 lg:max-h-[calc(100vh-7.5rem)]">
          <div className="min-h-[120px] flex-1 overflow-hidden">
            <CartPanel
              lines={lines}
              onQuantity={setQuantity}
              onPrice={(id, v) => patchLine(id, { unitPrice: v })}
              onDiscount={(id, v) => patchLine(id, { discount: v })}
              onRemove={(id) => setLines((prev) => prev.filter((l) => l.product.id !== id))}
              onClear={() => setLines([])}
            />
          </div>

          <div className="shrink-0 space-y-4 overflow-y-auto border-t border-border bg-surface-soft/40 px-5 py-4">
            <DocumentClientForm doc={doc} onDoc={setDoc} client={client} onClient={setClient} total={totals.total} />
            <PaymentSelector method={payment} onMethod={setPayment} received={received} onReceived={setReceived} total={totals.total} />

            <dl className="space-y-1 rounded-2xl bg-surface px-4 py-3 text-sm">
              {totals.discount > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <dt>Descuentos</dt>
                  <dd className="tabular-nums">−{soles(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <dt>Op. gravada</dt>
                <dd className="tabular-nums">{soles(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-text-secondary">
                <dt>IGV 18%</dt>
                <dd className="tabular-nums">{soles(totals.igv)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-border-soft pt-1.5">
                <dt className="font-semibold text-text-primary">Total</dt>
                <dd className="font-display text-2xl font-bold tabular-nums text-text-primary">{soles(totals.total)}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => void checkout()}
              disabled={submitting || lines.length === 0}
              title={problem ?? "Cobrar (F9)"}
              className="btn btn-primary h-14 w-full justify-center gap-2 rounded-2xl text-base font-semibold disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Registrando…
                </>
              ) : (
                <>
                  Cobrar {soles(totals.total)}
                  <kbd className="ml-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">F9</kbd>
                </>
              )}
            </button>
            {problem && lines.length > 0 && <p className="-mt-2 text-center text-xs text-text-muted">{problem}</p>}
          </div>
        </aside>
      </div>

      <CameraScannerModal open={cameraOpen} onClose={() => setCameraOpen(false)} onDetected={onCameraDetected} />
      <ReceiptPreview order={receipt} company={company} open={!!receipt} onClose={resetTill} onNewSale={resetTill} />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
      {children}
    </kbd>
  );
}
