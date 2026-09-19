"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, PackagePlus, Receipt, Search, Wallet, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { PurchaseDocumentModal } from "@/components/purchases/PurchaseDocumentModal";
import { fmtDate, fmtQty, num } from "@/components/purchases/format";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { suppliersApi } from "@/lib/api";
import { purchasingApi } from "@/lib/apis/purchasing";
import { inputClass, soles } from "@/lib/ui";
import type { SupplierDTO } from "@/types/api";
import type { PurchaseDocumentPageDTO } from "@/types/purchasing";

const PAGE_SIZE = 25;

export default function PurchasesHistoryPage() {
  const companyId = useCompanyId();
  const [supplierId, setSupplierId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("supplier");
    if (s) setSupplierId(s);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [supplierId, dateFrom, dateTo, q]);

  const suppliers = useApi(() => (companyId ? suppliersApi.list(companyId) : Promise.resolve([] as SupplierDTO[])), [companyId]);
  const docs = useApi<PurchaseDocumentPageDTO | null>(
    () =>
      companyId
        ? purchasingApi.documents(companyId, { supplier_id: supplierId, date_from: dateFrom, date_to: dateTo, q, page, size: PAGE_SIZE })
        : Promise.resolve(null),
    [companyId, supplierId, dateFrom, dateTo, q, page],
  );

  const supplierOptions = useMemo(
    () => [
      { value: "", label: "Todos los proveedores" },
      ...(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.business_name, description: `RUC ${s.ruc}` })),
    ],
    [suppliers.data],
  );

  const items = docs.data?.items ?? [];
  const pageTotal = items.reduce((a, d) => a + num(d.total), 0);
  const pageUnits = items.reduce((a, d) => a + d.units, 0);
  const hasFilters = !!(supplierId || dateFrom || dateTo || q);

  const clear = () => {
    setSupplierId("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ERP · Compras"
        title="Historial de compras"
        description="Cada comprobante de proveedor con sus productos, unidades y total."
        action={
          <Link href="/purchases/new" className="btn btn-primary h-10 gap-2 px-4 text-sm">
            <PackagePlus className="h-4 w-4" /> Nueva compra
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard title={hasFilters ? "Documentos (filtrados)" : "Documentos"} value={String(docs.data?.total ?? 0)} icon={Receipt} accent="primary" />
        <StatCard title="Monto de esta página (sin IGV)" value={soles(pageTotal)} icon={Wallet} accent="primary" />
        <StatCard title="Unidades de esta página" value={fmtQty(pageUnits)} icon={PackagePlus} accent="success" />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-border px-5 py-4 md:grid-cols-[1.2fr_1fr_150px_150px_auto] md:items-end">
          <FilterField label="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input className={inputClass(false, "pl-9 py-2")} placeholder="N° comprobante, proveedor o RUC" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </FilterField>
          <FilterField label="Proveedor">
            <Select value={supplierId} onChange={setSupplierId} options={supplierOptions} searchable />
          </FilterField>
          <FilterField label="Desde">
            <input type="date" className={inputClass(false, "py-2")} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </FilterField>
          <FilterField label="Hasta">
            <input type="date" className={inputClass(false, "py-2")} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </FilterField>
          <Button variant="ghost" onClick={clear} disabled={!hasFilters}>
            <X className="h-4 w-4" /> Limpiar
          </Button>
        </div>

        <DataState
          loading={docs.loading && !docs.data}
          error={docs.error}
          onRetry={docs.reload}
          empty={items.length === 0}
          emptyState={
            hasFilters ? (
              <p className="px-6 py-14 text-center text-sm text-text-muted">No hay compras con esos filtros.</p>
            ) : (
              <EmptyState
                className="m-5"
                icon={Receipt}
                title="Aún no registras compras"
                description="Registra la factura de tu proveedor o sube un Excel: el stock y el costo promedio se actualizan solos."
                action={{ label: "Registrar compra", href: "/purchases/new" }}
              />
            )
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60">
                  {["Fecha", "Comprobante", "Proveedor", "Productos", "Unidades", "Total (sin IGV)"].map((h, i) => (
                    <th key={h} className={`whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted ${i >= 3 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {items.map((d) => (
                  <tr key={d.document_id} onClick={() => setDocId(d.document_id)} className="cursor-pointer transition-colors hover:bg-primary-softer/60">
                    <td className="whitespace-nowrap px-5 py-3.5 text-text-secondary tabular-nums">{fmtDate(d.purchase_date)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-text-muted" />
                        {d.document_number ? (
                          <span className="font-mono text-[13px] font-medium text-text-primary">{d.document_number}</span>
                        ) : (
                          <span className="text-text-muted">Sin N°</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/suppliers/${d.supplier_id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-text-primary hover:text-primary">
                        {d.supplier_name}
                      </Link>
                      <span className="block font-mono text-[11px] text-text-muted">RUC {d.supplier_ruc}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{d.lines}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{fmtQty(d.units)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{soles(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {docs.data && docs.data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
              <span className="text-text-muted">
                Página {docs.data.page} de {docs.data.pages} · {docs.data.total} documentos
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= docs.data.pages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DataState>
      </Card>

      <PurchaseDocumentModal open={docId !== null} onClose={() => setDocId(null)} companyId={companyId} documentId={docId} />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</span>
      {children}
    </div>
  );
}
