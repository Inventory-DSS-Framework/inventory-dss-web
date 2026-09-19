"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, CalendarClock, FileText, Mail, MapPin, Package, PackagePlus, Pencil, Phone, Receipt, User, Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { DataState } from "@/components/ui/DataState";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { rucKind } from "@/components/suppliers/ruc";
import { PurchaseDocumentModal } from "@/components/purchases/PurchaseDocumentModal";
import { formatCustomValue } from "@/components/custom-fields/CustomFieldInput";
import { fmtDate, fmtQty, num } from "@/components/purchases/format";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useColumnConfig } from "@/hooks/useColumnConfig";
import { purchasingApi, supplierInsightsApi } from "@/lib/apis/purchasing";
import { soles } from "@/lib/ui";
import type { PurchaseDocumentPageDTO, SupplierSummaryDTO } from "@/types/purchasing";

export default function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const companyId = useCompanyId();
  const columns = useColumnConfig(companyId, "supplier");

  const summary = useApi<SupplierSummaryDTO | null>(
    () => (companyId && supplierId ? supplierInsightsApi.summary(companyId, supplierId) : Promise.resolve(null)),
    [companyId, supplierId],
  );
  const docs = useApi<PurchaseDocumentPageDTO | null>(
    () => (companyId && supplierId ? purchasingApi.documents(companyId, { supplier_id: supplierId, size: 100 }) : Promise.resolve(null)),
    [companyId, supplierId],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);

  const data = summary.data;
  const s = data?.supplier;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Link href="/suppliers" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Proveedores
      </Link>

      <DataState loading={summary.loading || !companyId} error={summary.error} onRetry={summary.reload}>
        {data && s && (
          <>
            <Card className="p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft font-display text-xl font-semibold text-primary">
                    {s.business_name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Proveedor</p>
                    <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.03em] text-text-primary">{s.business_name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-surface-muted px-2 py-0.5 font-mono text-xs text-text-secondary">RUC {s.ruc}</span>
                      {rucKind(s.ruc) && <span className="text-xs text-text-muted">{rucKind(s.ruc)}</span>}
                      <Badge variant={s.is_active ? "success" : "default"} dot>{s.is_active ? "Activo" : "Inactivo"}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Link href={`/purchases/new?supplier=${s.id}`} className="btn btn-primary h-10 gap-2 px-4 text-sm">
                    <PackagePlus className="h-4 w-4" /> Registrar compra
                  </Link>
                </div>
              </div>

              <div className="mt-6 grid gap-x-8 gap-y-4 border-t border-border-soft pt-5 sm:grid-cols-2 lg:grid-cols-4">
                <Info icon={User} label="Contacto" value={s.contact_name} />
                <Info icon={Phone} label="Teléfono" value={s.phone} />
                <Info icon={Mail} label="Correo" value={s.email} />
                <Info icon={MapPin} label="Dirección" value={s.address} />
                {columns.fields.map((f) => (
                  <div key={f.id} className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-violet">{f.label}</p>
                    <p className="mt-0.5 truncate text-sm text-text-primary">{formatCustomValue(f, s.custom_attributes?.[f.key])}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total comprado (sin IGV)" value={soles(data.total_purchased)} icon={Wallet} accent="primary" />
              <StatCard title="Compras (documentos)" value={`${data.documents_count} · ${data.purchases_count} líneas`} icon={Receipt} accent="primary" />
              <StatCard title="Última compra" value={fmtDate(data.last_purchase_date)} icon={CalendarClock} accent="success" />
              <StatCard title="Productos que te vende" value={String(data.products_count)} icon={Package} accent="success" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
              <Card className="overflow-hidden p-0">
                <SectionTitle title="Productos que suministra" subtitle="Cantidades y costos de todas sus compras" />
                {data.products.length === 0 ? (
                  <Empty text="Aún no le registras compras a este proveedor." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-soft/60">
                          <Th>Producto</Th>
                          <Th right>Cant. total</Th>
                          <Th right>Costo prom.</Th>
                          <Th right>Último costo</Th>
                          <Th right>Total</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-soft">
                        {data.products.map((p) => (
                          <tr key={p.product_id} className="transition-colors hover:bg-primary-softer/60">
                            <td className="px-5 py-3">
                              <Link href={`/inventory/${p.product_id}`} className="group block">
                                <span className="font-medium text-text-primary group-hover:text-primary">{p.name}</span>
                                <span className="block font-mono text-[11px] text-text-muted">{p.sku}</span>
                              </Link>
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums">{fmtQty(p.total_quantity)}</td>
                            <td className="px-5 py-3 text-right tabular-nums text-text-secondary">{soles(p.avg_unit_cost)}</td>
                            <td className="px-5 py-3 text-right tabular-nums">
                              {p.last_cost !== null ? soles(p.last_cost) : "—"}
                              <span className="block text-[11px] text-text-muted">{fmtDate(p.last_purchase_date)}</span>
                            </td>
                            <td className="px-5 py-3 text-right font-semibold tabular-nums">{soles(p.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card className="overflow-hidden p-0">
                <SectionTitle
                  title="Documentos de compra"
                  subtitle="Facturas y comprobantes registrados"
                  action={
                    <Link href={`/purchases?supplier=${s.id}`} className="text-xs font-semibold text-primary hover:underline">
                      Ver en historial
                    </Link>
                  }
                />
                {docs.loading ? (
                  <Empty text="Cargando…" />
                ) : (docs.data?.items ?? []).length === 0 ? (
                  <Empty text="Sin documentos todavía." />
                ) : (
                  <ul className="divide-y divide-border-soft">
                    {docs.data!.items.map((d) => (
                      <li key={d.document_id}>
                        <button
                          onClick={() => setDocId(d.document_id)}
                          className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-primary-softer/60"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-text-secondary">
                            <FileText className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-text-primary">
                              {d.document_number || "Sin N° de comprobante"}
                            </span>
                            <span className="block text-xs text-text-muted">
                              {fmtDate(d.purchase_date)} · {d.lines} {d.lines === 1 ? "producto" : "productos"} · {fmtQty(d.units)} u.
                            </span>
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-text-primary">{soles(d.total)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {data.recent_lines.length > 0 && (
              <Card className="overflow-hidden p-0">
                <SectionTitle title="Últimas líneas compradas" subtitle="Detalle por producto, lo más reciente primero" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-soft/60">
                        <Th>Fecha</Th>
                        <Th>Comprobante</Th>
                        <Th>Producto</Th>
                        <Th right>Cant.</Th>
                        <Th right>Costo unit.</Th>
                        <Th right>Subtotal</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft">
                      {data.recent_lines.map((l) => (
                        <tr key={l.id} className="hover:bg-primary-softer/40">
                          <td className="whitespace-nowrap px-5 py-2.5 text-text-secondary">{fmtDate(l.purchase_date)}</td>
                          <td className="whitespace-nowrap px-5 py-2.5">
                            {l.document_id ? (
                              <button onClick={() => setDocId(l.document_id)} className="font-medium text-primary hover:underline">
                                {l.document_number || "Ver documento"}
                              </button>
                            ) : (
                              <span className="text-text-secondary">{l.document_number || "—"}</span>
                            )}
                          </td>
                          <td className="px-5 py-2.5">
                            <Link href={`/inventory/${l.product_id}`} className="text-text-primary hover:text-primary">{l.product_name}</Link>
                            <span className="ml-2 font-mono text-[11px] text-text-muted">{l.sku}</span>
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{fmtQty(l.quantity)}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-text-secondary">{soles(l.unit_cost)}</td>
                          <td className="px-5 py-2.5 text-right font-medium tabular-nums">{soles(num(l.total_amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <SupplierFormModal
              open={editOpen}
              onClose={() => setEditOpen(false)}
              companyId={companyId}
              supplier={s}
              fields={columns.fields}
              onSaved={(saved) => {
                if (saved === null) window.location.href = "/suppliers";
                else summary.reload();
              }}
            />
          </>
        )}
      </DataState>

      <PurchaseDocumentModal open={docId !== null} onClose={() => setDocId(null)} companyId={companyId} documentId={docId} />
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</p>
        <p className="mt-0.5 truncate text-sm text-text-primary" title={value}>{value || "—"}</p>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted ${right ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-sm text-text-muted">{text}</p>;
}
