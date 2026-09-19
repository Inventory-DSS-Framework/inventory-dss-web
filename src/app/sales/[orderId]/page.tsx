"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, CalendarClock, CreditCard, FileText, Printer, Receipt, UserRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataState } from "@/components/ui/DataState";
import { cn } from "@/lib/utils";
import { inputClass, soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { posApi } from "@/lib/apis/pos";
import { DocumentBadge, OrderStatusBadge } from "@/components/pos/DocumentBadge";
import { formatLongDateTime } from "@/components/pos/dates";
import { ReceiptPreview } from "@/components/invoicing/ReceiptPreview";
import { DOCUMENT_LABEL, PAYMENT_LABEL, type SalesOrder } from "@/types/pos";
import { useExpertMode } from "@/hooks/useExpertMode";

export default function SaleDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const companyId = useCompanyId();
  const { company } = useProfile();
  const { isSeller, isAdmin } = useRole();
  const [expert] = useExpertMode();
  const showCost = !isSeller && expert;

  const order = useApi(
    () => (companyId && orderId ? posApi.get(companyId, orderId) : Promise.resolve(null)),
    [companyId, orderId],
  );
  const [override, setOverride] = useState<SalesOrder | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const o = override ?? order.data;

  const doVoid = async () => {
    if (!companyId || !o) return;
    setVoiding(true);
    setVoidError(null);
    try {
      setOverride(await posApi.void(companyId, o.id, reason.trim()));
      setVoidOpen(false);
      setReason("");
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : "No se pudo anular la venta.");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Link href="/sales" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver a Ventas
      </Link>

      <DataState loading={order.loading && !o} error={order.error} empty={!order.loading && !o} emptyMessage="Venta no encontrada." onRetry={order.reload}>
        {o && (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Venta #{o.order_number}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-text-primary">
                    {DOCUMENT_LABEL[o.document_type]} {o.document_number}
                  </h1>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="mt-1.5 text-sm capitalize text-text-secondary">{formatLongDateTime(o.sold_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setReceiptOpen(true)}>
                  <Printer className="h-4 w-4" /> Reimprimir
                </Button>
                {isAdmin && o.status === "completed" && (
                  <Button variant="ghost" className="!text-danger hover:!bg-danger-soft" onClick={() => setVoidOpen(true)}>
                    <Ban className="h-4 w-4" /> Anular venta
                  </Button>
                )}
              </div>
            </div>

            {o.status === "voided" && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
                <Ban className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Venta anulada: el stock fue devuelto al inventario
                  {o.invoice_id ? " y el comprobante quedó anulado" : ""}.{o.notes ? ` ${o.notes}` : ""}
                </span>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="overflow-hidden p-0 lg:col-span-2">
                <div className="border-b border-border px-6 py-4">
                  <h3 className="font-display text-base font-semibold text-text-primary">Productos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border">
                        {["Producto", "Cantidad", "Precio", "Descuento", "Total", ...(showCost ? ["Costo"] : [])].map((h, i) => (
                          <th key={h} className={cn("whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted", i > 0 && "text-right")}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft">
                      {o.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="px-5 py-3.5">
                            {isSeller ? (
                              <span className="text-sm font-medium text-text-primary">{l.product_name}</span>
                            ) : (
                              <Link href={`/inventory/${l.product_id}`} className="text-sm font-medium text-text-primary hover:text-primary">
                                {l.product_name}
                              </Link>
                            )}
                            {expert && <p className="font-mono text-[11px] text-text-muted">{l.sku}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm tabular-nums">{l.quantity}</td>
                          <td className="px-5 py-3.5 text-right text-sm tabular-nums text-text-secondary">{soles(l.unit_price)}</td>
                          <td className="px-5 py-3.5 text-right text-sm tabular-nums text-text-secondary">{Number(l.discount) > 0 ? `−${soles(l.discount)}` : "—"}</td>
                          <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums">{soles(l.line_total)}</td>
                          {showCost && (
                            <td className="px-5 py-3.5 text-right text-sm tabular-nums text-text-muted">{l.unit_cost != null ? soles(Number(l.unit_cost) * l.quantity) : "—"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end border-t border-border px-6 py-4">
                  <dl className="w-full max-w-xs space-y-1.5 text-sm">
                    {Number(o.discount_total) > 0 && <Line label="Descuentos" value={`−${soles(o.discount_total)}`} />}
                    <Line label="Subtotal (sin IGV)" value={soles(o.subtotal)} />
                    <Line label="IGV 18%" value={soles(o.igv)} />
                    <div className="flex items-baseline justify-between border-t border-border-soft pt-2">
                      <dt className="font-semibold text-text-primary">Total</dt>
                      <dd className="font-display text-xl font-bold tabular-nums text-text-primary">{soles(o.total)}</dd>
                    </div>
                    {!isSeller && (
                      <div className="flex justify-between pt-1 text-xs text-text-muted">
                        <dt>Ganaste en esta venta (sin IGV)</dt>
                        <dd className="tabular-nums text-success">{soles(o.gross_margin)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </Card>

              <div className="space-y-5">
                <InfoCard icon={UserRound} title="Cliente">
                  <p className="font-medium text-text-primary">{o.client_name || "Público en general"}</p>
                  {o.client_doc_number && (
                    <p className="font-mono text-sm text-text-secondary">{o.client_doc_type.toUpperCase()} {o.client_doc_number}</p>
                  )}
                  {o.client_address && <p className="text-sm text-text-secondary">{o.client_address}</p>}
                </InfoCard>

                <InfoCard icon={CreditCard} title="Pago">
                  <Line label="Forma de pago" value={PAYMENT_LABEL[o.payment_method]} />
                  {o.amount_received != null && <Line label="Recibido" value={soles(o.amount_received)} />}
                  {o.change != null && <Line label="Vuelto" value={soles(o.change)} />}
                  <Line label="Vendedor" value={o.seller_name || "—"} />
                </InfoCard>

                <InfoCard icon={o.invoice_id ? FileText : Receipt} title="Comprobante">
                  <DocumentBadge type={o.document_type} number={o.document_number} />
                  {o.invoice_id ? (
                    <p className="text-sm text-text-secondary">
                      Estado:{" "}
                      <span className={o.invoice_status === "anulada" ? "font-semibold text-danger" : "font-semibold text-success"}>
                        {o.invoice_status === "anulada" ? "Anulado" : "Emitido"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-text-muted">Nota de venta: es solo para tu control, no se envía a SUNAT.</p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-text-muted">
                    <CalendarClock className="h-3.5 w-3.5" /> {o.items_count} productos distintos · {o.units} unidades
                  </p>
                </InfoCard>

                {o.notes && o.status !== "voided" && (
                  <InfoCard icon={FileText} title="Notas">
                    <p className="text-sm text-text-secondary">{o.notes}</p>
                  </InfoCard>
                )}
              </div>
            </div>

            <ReceiptPreview order={o} company={company} open={receiptOpen} onClose={() => setReceiptOpen(false)} />

            <Modal
              open={voidOpen}
              onClose={() => !voiding && setVoidOpen(false)}
              title={`Anular venta #${o.order_number}`}
              description="Esta acción no se puede deshacer."
              size="sm"
              footer={
                <>
                  <Button variant="secondary" onClick={() => setVoidOpen(false)} disabled={voiding}>Cancelar</Button>
                  <Button onClick={doVoid} disabled={voiding} className="!bg-danger hover:!bg-danger/90">
                    <Ban className="h-4 w-4" /> {voiding ? "Anulando…" : "Anular venta"}
                  </Button>
                </>
              }
            >
              <div className="space-y-4 text-sm text-text-secondary">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Se devolverán {o.units} uds al inventario.</li>
                  {o.invoice_id && <li>El comprobante {o.document_number} quedará anulado.</li>}
                  <li>La venta dejará de contar en los reportes ({soles(o.total)}).</li>
                </ul>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-text-primary">Motivo (opcional)</span>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. error en el cobro" className={inputClass()} />
                </label>
                {voidError && <p className="text-danger">{voidError}</p>}
              </div>
            </Modal>
          </>
        )}
      </DataState>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-2 p-5">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </Card>
  );
}
