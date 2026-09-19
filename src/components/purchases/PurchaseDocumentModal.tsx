"use client";

import Link from "next/link";
import { CalendarDays, FileText, Truck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { purchasingApi } from "@/lib/apis/purchasing";
import { soles } from "@/lib/ui";
import type { PurchaseDocumentDetailDTO } from "@/types/purchasing";
import { IGV_RATE, fmtDate, fmtQty, num } from "./format";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  documentId: string | null;
}

/** Detail of one supplier document (factura): header, lines and totals. */
export function PurchaseDocumentModal({ open, onClose, companyId, documentId }: Props) {
  const doc = useApi<PurchaseDocumentDetailDTO | null>(
    () => (open && companyId && documentId ? purchasingApi.document(companyId, documentId) : Promise.resolve(null)),
    [open, companyId, documentId],
  );
  const d = doc.data;
  const subtotal = num(d?.total);
  const igv = Math.round(subtotal * IGV_RATE * 100) / 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={d ? (d.document_number ? `Compra · ${d.document_number}` : "Compra sin número de factura") : "Detalle de la compra"}
      description={d ? d.supplier_name : undefined}
      footer={
        <>
          {d && (
            <Link href={`/suppliers/${d.supplier_id}`} className="btn btn-ghost mr-auto h-10 gap-2 px-3 text-sm">
              <Truck className="h-4 w-4" /> Ver proveedor
            </Link>
          )}
          <Button onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      {doc.loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
        </div>
      ) : doc.error ? (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{doc.error}</div>
      ) : d ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Meta icon={FileText} label="N° de factura o boleta" value={d.document_number || "—"} />
            <Meta icon={CalendarDays} label="Fecha" value={fmtDate(d.purchase_date)} />
            <Meta icon={Truck} label="Unidades" value={`${fmtQty(d.units)} de ${d.lines.length} ${d.lines.length === 1 ? "producto" : "productos"}`} />
          </div>
          {d.notes && <p className="rounded-xl bg-surface-soft px-4 py-2.5 text-sm text-text-secondary">{d.notes}</p>}

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60">
                  {["Código", "Producto", "Cantidad", "Costo c/u", "Subtotal"].map((h, i) => (
                    <th key={h} className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted ${i >= 2 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {d.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-text-secondary">{l.sku}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/inventory/${l.product_id}`} className="font-medium text-text-primary hover:text-primary">{l.product_name}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtQty(l.quantity)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary">{soles(l.unit_cost)}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{soles(l.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <Row label="Subtotal (sin IGV)" value={soles(subtotal)} />
            <Row label="IGV 18%" value={soles(igv)} />
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="font-display text-lg font-semibold tabular-nums text-text-primary">{soles(subtotal + igv)}</span>
            </div>
            <p className="text-[11px] text-text-muted">Guardamos tus costos sin IGV.</p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-soft/50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="tabular-nums text-text-primary">{value}</span>
    </div>
  );
}
