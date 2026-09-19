"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, Coins, FileSpreadsheet, Loader2, PlusCircle, Receipt, Search, TrendingUp, Upload, Wallet } from "lucide-react";
import { SalesImportWizard } from "@/components/sales/SalesImportWizard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { inputClass, soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useRole } from "@/hooks/useRole";
import { posApi } from "@/lib/apis/pos";
import { usersApi } from "@/lib/apis/users";
import { productsApi, salesApi } from "@/lib/api";
import { DocumentBadge, OrderStatusBadge } from "@/components/pos/DocumentBadge";
import { RangePreset, formatDateTime, presetRange, shortDay } from "@/components/pos/dates";
import { PAYMENT_LABEL, type SalesDocumentType } from "@/types/pos";

const PRESETS: { id: Exclude<RangePreset, "custom">; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "month", label: "Este mes" },
];

const PAGE_SIZE = 25;

export default function SalesPage() {
  const companyId = useCompanyId();
  const { isSeller, isAdmin } = useRole();
  const [tab, setTab] = useState<"pos" | "imported">("pos");

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ERP · Ventas"
        title="Ventas"
        description={
          isSeller
            ? "Tus tickets del periodo: comprobantes emitidos, cobros y detalle de cada venta."
            : "Tickets del punto de venta con su comprobante, cobro, vendedor y margen."
        }
        action={
          <Link href="/sales/new" className="btn btn-primary gap-2 px-4 py-2.5 text-sm">
            <PlusCircle className="h-4 w-4" /> Nueva venta
          </Link>
        }
      />

      {!isSeller && (
        <Tabs
          tabs={[
            { id: "pos", label: "Tickets" },
            { id: "imported", label: "Historial importado" },
          ]}
          value={tab}
          onChange={(id) => setTab(id as "pos" | "imported")}
        />
      )}

      {companyId && (tab === "pos" || isSeller ? (
        <OrdersView companyId={companyId} isSeller={isSeller} isAdmin={isAdmin} />
      ) : (
        <ImportedHistory companyId={companyId} />
      ))}
    </div>
  );
}

function OrdersView({ companyId, isSeller, isAdmin }: { companyId: string; isSeller: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [preset, setPreset] = useState<RangePreset>("7d");
  const [range, setRange] = useState(() => presetRange("7d"));
  const [sellerId, setSellerId] = useState("");
  const [docType, setDocType] = useState<"" | SalesDocumentType>("");
  const [status, setStatus] = useState<"" | "completed" | "voided">("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [range, sellerId, docType, status, q]);

  const summary = useApi(
    () => posApi.summary(companyId, { date_from: range.from, date_to: range.to, seller_id: sellerId || undefined }),
    [companyId, range.from, range.to, sellerId],
  );
  const orders = useApi(
    () =>
      posApi.list(companyId, {
        date_from: range.from,
        date_to: range.to,
        seller_id: sellerId || undefined,
        document_type: docType || undefined,
        status: status || undefined,
        q: q || undefined,
        page,
        size: PAGE_SIZE,
      }),
    [companyId, range.from, range.to, sellerId, docType, status, q, page],
  );
  const users = useApi(
    () => (isAdmin ? usersApi.list(companyId) : Promise.resolve([])),
    [companyId, isAdmin],
  );

  const sellerOptions = useMemo(() => {
    const map = new Map<string, string>();
    (users.data ?? []).forEach((u) => map.set(u.id, u.full_name));
    (summary.data?.by_seller ?? []).forEach((s) => s.seller_id && !map.has(s.seller_id) && map.set(s.seller_id, s.seller_name));
    return [{ value: "", label: "Todos los vendedores" }, ...[...map].map(([value, label]) => ({ value, label }))];
  }, [users.data, summary.data]);

  const s = summary.data;
  const chartData = (s?.by_day ?? []).map((d) => ({ day: shortDay(d.date), total: Number(d.total), orders: d.orders }));
  const rows = orders.data?.items ?? [];
  const payments = s?.by_payment_method ?? [];
  const paymentsTotal = payments.reduce((a, p) => a + Number(p.total), 0);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-surface-muted/70 p-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPreset(p.id);
                setRange(presetRange(p.id));
              }}
              className={cn(
                "h-8 rounded-lg px-3 text-sm font-medium transition-all",
                preset === p.id ? "bg-surface text-text-primary shadow-soft" : "text-text-muted hover:text-text-secondary",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => {
              setPreset("custom");
              setRange((r) => ({ ...r, from: e.target.value || r.from }));
            }}
            className={inputClass(false, "h-10 w-[150px] py-1.5")}
            aria-label="Desde"
          />
          <span className="text-text-muted">—</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => {
              setPreset("custom");
              setRange((r) => ({ ...r, to: e.target.value || r.to }));
            }}
            className={inputClass(false, "h-10 w-[150px] py-1.5")}
            aria-label="Hasta"
          />
        </div>
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
          {!isSeller && (
            <Select value={sellerId} onChange={setSellerId} options={sellerOptions} aria-label="Vendedor" />
          )}
          <Select
            value={docType}
            onChange={(v) => setDocType(v as "" | SalesDocumentType)}
            options={[
              { value: "", label: "Todos los comprobantes" },
              { value: "boleta", label: "Boleta" },
              { value: "factura", label: "Factura" },
              { value: "nota_venta", label: "Nota de venta" },
            ]}
            aria-label="Comprobante"
          />
          <Select
            value={status}
            onChange={(v) => setStatus(v as "" | "completed" | "voided")}
            options={[
              { value: "", label: "Todos los estados" },
              { value: "completed", label: "Completadas" },
              { value: "voided", label: "Anuladas" },
            ]}
            aria-label="Estado"
          />
        </div>
        <div className="relative lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cliente, DNI/RUC o N° de ticket"
            className={inputClass(false, "h-10 pl-9")}
          />
        </div>
      </Card>

      {/* KPIs */}
      <div className={cn("grid grid-cols-2 gap-4", isSeller ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
        <Kpi icon={Coins} label="Ventas del periodo" value={s ? soles(s.revenue) : "—"} hint={s ? `Sin IGV ${soles(s.revenue_net)}` : undefined} loading={summary.loading} />
        <Kpi icon={Receipt} label="N° tickets" value={s ? s.orders.toLocaleString("es-PE") : "—"} hint={s ? `${s.units.toLocaleString("es-PE")} uds vendidas${s.voided_orders ? ` · ${s.voided_orders} anuladas` : ""}` : undefined} loading={summary.loading} />
        <Kpi icon={Wallet} label="Ticket promedio" value={s ? soles(s.avg_ticket) : "—"} loading={summary.loading} />
        {!isSeller && (
          <Kpi
            icon={TrendingUp}
            label="Margen bruto"
            value={s ? soles(s.gross_margin) : "—"}
            hint={s ? `${Number(s.margin_pct).toFixed(1)}% sobre ventas sin IGV` : undefined}
            loading={summary.loading}
            tone="success"
          />
        )}
      </div>

      {/* Chart + payment mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-base font-semibold text-text-primary">Ventas por día</h3>
            <span className="text-xs text-text-muted">S/ con IGV</span>
          </div>
          <div className="h-[190px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(var(--c-primary))" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="rgb(var(--c-primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgb(var(--c-border))" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "rgb(var(--c-text-muted))" }} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11, fill: "rgb(var(--c-text-muted))" }} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
                  <Tooltip
                    cursor={{ stroke: "rgb(var(--c-border))" }}
                    contentStyle={{ background: "rgb(var(--c-surface))", border: "1px solid rgb(var(--c-border))", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "rgb(var(--c-text))", fontWeight: 600 }}
                    formatter={(value, name) => (name === "total" ? [soles(Number(value)), "Ventas"] : [String(value), "Tickets"])}
                  />
                  <Area type="monotone" dataKey="total" stroke="rgb(var(--c-primary))" strokeWidth={2} fill="url(#salesArea)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-text-muted">
                {summary.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sin datos"}
              </div>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-display text-base font-semibold text-text-primary">Cobros por método</h3>
          {payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">Sin cobros en el periodo</p>
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => {
                const pct = paymentsTotal ? (Number(p.total) / paymentsTotal) * 100 : 0;
                return (
                  <li key={p.payment_method}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-text-secondary">{PAYMENT_LABEL[p.payment_method] ?? p.payment_method} <span className="text-text-muted">· {p.orders}</span></span>
                      <span className="font-semibold tabular-nums text-text-primary">{soles(p.total)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Orders table */}
      <DataState
        loading={orders.loading && !orders.data}
        error={orders.error}
        empty={!orders.loading && rows.length === 0}
        onRetry={orders.reload}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No hay ventas con estos filtros"
            description="Cambia el rango de fechas o registra una venta desde el punto de venta."
            action={{ label: "Nueva venta", href: "/sales/new" }}
          />
        }
      >
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="font-display text-base font-semibold text-text-primary">Tickets</h3>
            <span className="text-xs text-text-muted">{orders.data?.total.toLocaleString("es-PE") ?? 0} resultados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Ticket", "Fecha y hora", "Comprobante", "Cliente", ...(isSeller ? [] : ["Vendedor"]), "Ítems", "Pago", "Total", "Estado"].map((h) => (
                    <th key={h} className={cn("whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted", (h === "Total" || h === "Ítems") && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cn("divide-y divide-border-soft", orders.loading && "opacity-60")}>
                {rows.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/sales/${o.id}`)}
                    className={cn("cursor-pointer transition-colors hover:bg-surface-soft/70", o.status === "voided" && "text-text-muted")}
                  >
                    <td className="px-5 py-3.5 font-mono text-sm font-semibold text-text-primary">#{o.order_number}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-text-secondary">{formatDateTime(o.sold_at)}</td>
                    <td className="px-5 py-3.5"><DocumentBadge type={o.document_type} number={o.document_number} /></td>
                    <td className="max-w-[220px] px-5 py-3.5 text-sm">
                      <p className="truncate text-text-primary">{o.client_name || "Público en general"}</p>
                      {o.client_doc_number && (
                        <p className="font-mono text-[11px] text-text-muted">{o.client_doc_type.toUpperCase()} {o.client_doc_number}</p>
                      )}
                    </td>
                    {!isSeller && <td className="whitespace-nowrap px-5 py-3.5 text-sm text-text-secondary">{o.seller_name || "—"}</td>}
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums text-text-secondary">{o.units}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</td>
                    <td className={cn("whitespace-nowrap px-5 py-3.5 text-right text-sm font-semibold tabular-nums", o.status === "voided" ? "line-through" : "text-text-primary")}>
                      {soles(o.total)}
                    </td>
                    <td className="px-5 py-3.5"><OrderStatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(orders.data?.pages ?? 1) > 1 && (
            <Pager page={page} pages={orders.data?.pages ?? 1} onPage={setPage} />
          )}
        </Card>
      </DataState>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  tone = "primary",
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  tone?: "primary" | "success";
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">{label}</span>
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", tone === "success" ? "bg-success-soft text-success" : "bg-primary-soft text-primary")}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("font-display text-[26px] font-bold leading-none tracking-tight tabular-nums text-text-primary transition-opacity", loading && "opacity-50")}>
        {value}
      </p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </Card>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-border px-6 py-3 text-sm text-text-secondary">
      <span>Página {page} de {pages}</span>
      <div className="flex gap-1.5">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn btn-secondary px-2.5 py-1.5 disabled:opacity-40" aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn btn-secondary px-2.5 py-1.5 disabled:opacity-40" aria-label="Siguiente">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const HISTORY_PAGE = 50;

/** Legacy / CSV-imported sales (no POS ticket), kept so the imported history isn't lost. */
function ImportedHistory({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const sales = useApi(() => salesApi.list(companyId, page, HISTORY_PAGE, "imported"), [companyId, page]);
  const products = useApi(() => productsApi.list(companyId), [companyId]);
  const productOf = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const rows = sales.data ?? [];

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-text-primary">¿Vienes de otro sistema o de Excel?</p>
            <p className="text-xs text-text-secondary">
              Sube tu reporte de ventas anterior: queda como historial, no descuenta stock y alimenta el Motor FTGM.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setImportOpen(true)} className="btn btn-primary gap-2 px-4 py-2.5 text-sm">
          <Upload className="h-4 w-4" /> Importar ventas
        </button>
      </Card>
      <SalesImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        companyId={companyId}
        onFinished={() => {
          setPage(1);
          sales.reload();
        }}
      />
    <DataState
      loading={sales.loading && !sales.data}
      error={sales.error}
      empty={!sales.loading && rows.length === 0 && page === 1}
      onRetry={sales.reload}
      emptyState={
        <EmptyState
          icon={Receipt}
          title="Sin historial importado"
          description="Usa “Importar ventas” para cargar tu historial anterior; aparecerá aquí."
        />
      }
    >
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="font-display text-base font-semibold text-text-primary">Historial importado</h3>
            <p className="text-xs text-text-muted">Ventas por línea sin ticket del POS — alimentan los pronósticos.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Fecha", "Producto", "SKU", "Cantidad", "P. unit.", "Total", "Origen"].map((h) => (
                  <th key={h} className={cn("whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted", ["Cantidad", "P. unit.", "Total"].includes(h) && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn("divide-y divide-border-soft", sales.loading && "opacity-60")}>
              {rows.map((s) => {
                const p = productOf.get(s.product_id);
                return (
                  <tr key={s.id} className="hover:bg-surface-soft/70">
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-text-secondary">{s.sale_date}</td>
                    <td className="px-5 py-3 text-sm">
                      <Link href={`/inventory/${s.product_id}`} className="text-text-primary hover:text-primary">
                        {p?.name ?? s.product_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-text-muted">{p?.sku ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{s.quantity}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums text-text-secondary">{soles(s.unit_price)}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums">{soles(s.total_amount)}</td>
                    <td className="px-5 py-3 text-xs text-text-muted">{s.batch_id ? "Carga de archivo" : "Registro manual"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-6 py-3 text-sm text-text-secondary">
          <span>Página {page}</span>
          <div className="flex gap-1.5">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn btn-secondary px-2.5 py-1.5 disabled:opacity-40" aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" disabled={rows.length < HISTORY_PAGE} onClick={() => setPage(page + 1)} className="btn btn-secondary px-2.5 py-1.5 disabled:opacity-40" aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </DataState>
    </div>
  );
}
