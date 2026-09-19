"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { amountInWords } from "@/components/pos/peru";
import type { CompanyDTO } from "@/types/api";
import { PAYMENT_LABEL, type SalesOrder } from "@/types/pos";

const money = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DOC_TITLE: Record<SalesOrder["document_type"], string> = {
  boleta: "BOLETA DE VENTA ELECTRÓNICA",
  factura: "FACTURA ELECTRÓNICA",
  nota_venta: "NOTA DE VENTA",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Lima" }),
    time: d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" }),
  };
}

/** The 80 mm thermal ticket itself (screen + print share this markup). */
export function Ticket({ order, company }: { order: SalesOrder; company: CompanyDTO | null }) {
  const { date, time } = formatDateTime(order.sold_at);
  const voided = order.status === "voided";
  const docLabel = order.client_doc_type === "ruc" ? "RUC" : order.client_doc_type === "dni" ? "DNI" : "DOC";

  return (
    <div className="pos-ticket relative mx-auto w-[302px] bg-white px-4 py-5 font-mono text-[11.5px] leading-[1.45] text-neutral-900 shadow-soft-lg">
      {voided && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="rotate-[-24deg] rounded-md border-4 border-red-600/70 px-3 py-1 text-2xl font-black tracking-widest text-red-600/70">
            ANULADO
          </span>
        </div>
      )}
      <div className="text-center">
        <p className="text-[14px] font-bold uppercase">{company?.name ?? "Mi empresa"}</p>
        <p>RUC {company?.tax_id ?? "—"}</p>
        {company?.address && <p>{company.address}</p>}
        {company?.phone && <p>Tel. {company.phone}</p>}
      </div>
      <Divider />
      <div className="text-center">
        <p className="font-bold">{DOC_TITLE[order.document_type]}</p>
        <p className="text-[13px] font-bold">{order.document_number}</p>
      </div>
      <Divider />
      <Row label="Fecha" value={`${date} ${time}`} />
      <Row label="Ticket" value={`#${order.order_number}`} />
      <Row label="Vendedor" value={order.seller_name || "—"} />
      {(order.client_name || order.client_doc_number) && (
        <>
          <Row label="Cliente" value={order.client_name || "—"} />
          {order.client_doc_number && <Row label={docLabel} value={order.client_doc_number} />}
          {order.client_address && <Row label="Dir." value={order.client_address} />}
        </>
      )}
      <Divider />
      <div className="flex justify-between font-bold">
        <span>DESCRIPCIÓN</span>
        <span>IMPORTE</span>
      </div>
      {order.lines.map((l) => (
        <div key={l.id} className="mt-1">
          <p className="uppercase">{l.product_name}</p>
          <div className="flex justify-between">
            <span>
              {l.quantity} x {money(l.unit_price)}
              {Number(l.discount) > 0 && ` - dsc ${money(l.discount)}`}
            </span>
            <span>{money(l.line_total)}</span>
          </div>
        </div>
      ))}
      <Divider />
      {Number(order.discount_total) > 0 && <Row label="Descuentos" value={`-${money(order.discount_total)}`} />}
      {order.document_type !== "nota_venta" ? (
        <>
          <Row label="OP. GRAVADA S/" value={money(order.subtotal)} />
          <Row label="IGV 18% S/" value={money(order.igv)} />
        </>
      ) : null}
      <div className="mt-1 flex justify-between text-[14px] font-bold">
        <span>TOTAL S/</span>
        <span>{money(order.total)}</span>
      </div>
      <p className="mt-1 text-[10.5px]">{amountInWords(Number(order.total))}</p>
      <Divider />
      <Row label="Pago" value={PAYMENT_LABEL[order.payment_method]} />
      {order.payment_method === "efectivo" && order.amount_received != null && (
        <>
          <Row label="Recibido S/" value={money(order.amount_received)} />
          <Row label="Vuelto S/" value={money(order.change)} />
        </>
      )}
      <Divider />
      <div className="text-center text-[10.5px]">
        {order.document_type === "nota_venta" ? (
          <p>Documento interno sin valor tributario. Canjeable por boleta o factura.</p>
        ) : (
          <p>Representación impresa del comprobante electrónico. Prototipo académico: no enviado a SUNAT.</p>
        )}
        <p className="mt-1.5 font-bold">¡Gracias por su compra!</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-neutral-400" />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0">{label}:</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

const PRINT_CSS = `
@media print {
  @page { size: 80mm auto; margin: 0; }
  body > *:not(#pos-print-root) { display: none !important; }
  #pos-print-root { display: block !important; }
  #pos-print-root .pos-ticket { box-shadow: none !important; width: 80mm !important; padding: 4mm !important; }
}
#pos-print-root { display: none; }
`;

/** Receipt modal shown after checkout (and reprint from the sale detail). */
export function ReceiptPreview({
  order,
  company,
  open,
  onClose,
  onNewSale,
}: {
  order: SalesOrder | null;
  company: CompanyDTO | null;
  open: boolean;
  onClose: () => void;
  onNewSale?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !onNewSale) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        onNewSale();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onNewSale]);

  if (!order) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={order.status === "voided" ? "Venta anulada" : `Venta registrada · ${order.document_number}`}
        description={`Total cobrado S/ ${money(order.total)}${order.change != null ? ` · Vuelto S/ ${money(order.change)}` : ""}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            {onNewSale ? (
              <Button onClick={onNewSale} autoFocus>
                <Plus className="h-4 w-4" /> Nueva venta
              </Button>
            ) : (
              <Button onClick={onClose}>Cerrar</Button>
            )}
          </>
        }
      >
        <div className="rounded-2xl bg-surface-muted/60 py-5">
          <Ticket order={order} company={company} />
        </div>
      </Modal>
      {open &&
        mounted &&
        createPortal(
          <div id="pos-print-root">
            <style>{PRINT_CSS}</style>
            <Ticket order={order} company={company} />
          </div>,
          document.body,
        )}
    </>
  );
}
