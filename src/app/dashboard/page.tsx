"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Crown,
  PackageMinus,
  PackageX,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  UploadCloud,
  Wallet,
  Warehouse,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { ChartTooltip, LegendChip } from "@/components/ftgm/ChartTooltip";
import { dateLabel, horizonLabel, num, runStatusMeta } from "@/components/ftgm/labels";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useBrandColors } from "@/hooks/useBrandColors";
import { useCompanyId } from "@/hooks/useCompanyId";
import { usePlan } from "@/hooks/usePlan";
import { dashboardApi, ftgmApi } from "@/lib/apis/ftgm";

export default function DashboardPage() {
  const companyId = useCompanyId();
  const colors = useBrandColors();
  const { isPremium } = usePlan();
  const summary = useApi(() => (companyId ? dashboardApi.erpSummary(companyId) : Promise.resolve(null)), [companyId]);
  const runs = useApi(() => (companyId ? ftgmApi.listRuns(companyId, 5).catch(() => []) : Promise.resolve([])), [companyId]);
  const s = summary.data;
  const latest = (runs.data ?? [])[0];
  const latestOk = (runs.data ?? []).find((r) => r.status === "success");

  const chart = useMemo(
    () =>
      (s?.sales_by_day ?? []).map((d) => ({
        name: d.date,
        revenue: d.revenue,
        tickets: d.tickets,
        units: d.units,
      })),
    [s],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="Inicio"
        title="Panel de control"
        description={s ? `Tu negocio al ${dateLabel(s.today)}: ventas, stock y compras en un vistazo.` : "Tu negocio en un vistazo."}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/sales/new" className="btn btn-primary h-10 gap-2 px-4 text-sm">
              <ShoppingCart className="h-4 w-4" /> Nueva venta
            </Link>
            <Link href="/purchases/new" className="btn btn-secondary h-10 gap-2 px-4 text-sm">
              <Truck className="h-4 w-4" /> Nueva compra
            </Link>
            <Link href="/inventory/import" className="btn btn-ghost h-10 gap-2 px-4 text-sm">
              <UploadCloud className="h-4 w-4" /> Importar inventario
            </Link>
          </div>
        }
      />

      <DataState loading={summary.loading && !s} error={summary.error} onRetry={summary.reload}>
        {s && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tile icon={Receipt} label="Ventas de hoy" value={soles(s.revenue_today)} hint={`${s.tickets_today} ticket(s) · ${num(s.units_today)} u`} />
              <Tile
                icon={Wallet}
                label="Ventas últimos 30 días"
                value={soles(s.revenue_30d)}
                hint={`7 días: ${soles(s.revenue_7d)}`}
                change={s.revenue_change_pct}
              />
              <Tile
                icon={ShoppingBag}
                label="Ticket promedio (30 d)"
                value={s.avg_ticket_30d != null ? soles(s.avg_ticket_30d) : "—"}
                hint={`${num(s.tickets_30d)} tickets`}
              />
              <Tile icon={Warehouse} label="Inventario a costo" value={soles(s.inventory_value)} hint={`${s.active_products} productos activos`} />
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <MiniTile icon={Truck} label="Compras del mes" value={soles(s.purchases_month_total)} hint={`${s.purchases_month_count} registro(s)`} />
              <MiniTile icon={PackageMinus} label="Bajo stock de seguridad" value={`${s.low_stock_count}`} tone={s.low_stock_count ? "warning" : undefined} />
              <MiniTile icon={PackageX} label="Sin stock" value={`${s.out_of_stock_count}`} tone={s.out_of_stock_count ? "danger" : undefined} />
              <MiniTile
                icon={AlertTriangle}
                label="Ventas perdidas (30 d)"
                value={`${s.lost_sales_30d_attempts}`}
                hint={`${num(s.lost_sales_30d_units)} u no vendidas por quiebre`}
                tone={s.lost_sales_30d_attempts ? "danger" : undefined}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-text-primary">Ventas por día</h3>
                    <p className="text-xs text-text-secondary">Últimos 30 días · incluye tickets del POS y ventas importadas.</p>
                  </div>
                  <div className="flex gap-2">
                    <LegendChip color={colors.primary} label="Ingresos" />
                    <LegendChip color={colors.accent} label="Tickets" />
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chart} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={colors.grid} />
                      <XAxis
                        dataKey="name"
                        tickFormatter={(v: string) => dateLabel(v).split(" ").slice(0, 2).join(" ")}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: colors.muted, fontSize: 11 }}
                        minTickGap={20}
                        dy={6}
                      />
                      <YAxis yAxisId="r" axisLine={false} tickLine={false} tick={{ fill: colors.muted, fontSize: 11 }} width={56} />
                      <YAxis yAxisId="t" orientation="right" axisLine={false} tickLine={false} tick={{ fill: colors.muted, fontSize: 11 }} width={30} />
                      <Tooltip
                        cursor={{ fill: colors.grid, fillOpacity: 0.4 }}
                        content={
                          <ChartTooltip
                            names={{ revenue: "Ingresos", tickets: "Tickets", units: "Unidades" }}
                            format={(k, v) => (k === "revenue" ? soles(Number(v)) : num(Number(v)))}
                            labelFormat={dateLabel}
                          />
                        }
                      />
                      <Bar yAxisId="r" dataKey="revenue" fill={colors.primary} fillOpacity={0.8} radius={[5, 5, 0, 0]} maxBarSize={22} />
                      <Line yAxisId="t" dataKey="tickets" stroke={colors.accent} strokeWidth={2} dot={false} />
                      <Line yAxisId="t" dataKey="units" stroke="transparent" dot={false} activeDot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <FtgmCard
                isPremium={isPremium}
                latest={latestOk ?? latest}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <Header title="Stock bajo" subtitle="En o por debajo del stock de seguridad." href="/inventory" />
                {s.low_stock.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">Todo tu catálogo está sobre su stock de seguridad.</p>
                ) : (
                  <div className="space-y-2">
                    {s.low_stock.map((p) => (
                      <Link
                        key={p.product_id}
                        href={`/inventory/${p.product_id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3 transition-colors hover:bg-surface-muted"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{p.name}</p>
                          <p className="font-mono text-[11px] text-text-muted">
                            {p.sku} · seguridad {p.safety_stock} · reorden {p.reorder_point}
                          </p>
                        </div>
                        <Badge variant={p.on_hand <= 0 ? "danger" : "warning"} dot>
                          {p.on_hand <= 0 ? "Sin stock" : `${p.on_hand} u`}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <Header title="Más vendidos (30 días)" subtitle="Por ingresos." href="/sales" />
                {s.top_products.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">Aún no hay ventas en los últimos 30 días.</p>
                ) : (
                  <div className="space-y-3">
                    {s.top_products.map((p, i) => {
                      const max = s.top_products[0].revenue || 1;
                      return (
                        <Link key={p.product_id} href={`/inventory/${p.product_id}`} className="group block">
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="w-4 text-xs font-semibold text-text-muted">{i + 1}</span>
                              <span className="truncate font-medium text-text-primary group-hover:text-primary">{p.name}</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-text-secondary">
                              {soles(p.revenue)} · {num(p.units)} u
                            </span>
                          </div>
                          <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(p.revenue / max) * 100}%` }} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  change,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
}) {
  return (
    <Card interactive particle className="flex flex-col justify-between gap-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-text-secondary">{label}</p>
        <span className="rounded-xl bg-primary-soft p-2.5 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div>
        <p className="font-display text-[28px] font-semibold leading-none tracking-[-0.03em] text-text-primary tabular-nums">{value}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {change != null && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 font-semibold",
                change >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
              )}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}% vs 30 d previos
            </span>
          )}
          {hint}
        </div>
      </div>
    </Card>
  );
}

function MiniTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
  hint?: string;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-surface-muted text-text-secondary",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] text-text-muted">{label}</p>
        <p className="font-display text-lg font-semibold leading-tight text-text-primary tabular-nums">{value}</p>
        {hint && <p className="truncate text-[11px] text-text-muted">{hint}</p>}
      </div>
    </div>
  );
}

function Header({ title, subtitle, href }: { title: string; subtitle: string; href: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-base font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-secondary">{subtitle}</p>
      </div>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">
        Ver todo <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function FtgmCard({ isPremium, latest }: { isPremium: boolean; latest?: import("@/types/ftgm").FtgmRun }) {
  return (
    <Card className="flex flex-col justify-between gap-5 border-accent-violet/25 bg-accent-violet-soft/15">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-violet-soft px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent-violet">
          <Sparkles className="h-3 w-3" /> Motor FTGM
        </div>
        {latest ? (
          <>
            <h3 className="font-display text-lg font-semibold text-text-primary">{latest.scope_description ?? "Último pronóstico"}</h3>
            <p className="text-xs text-text-muted">
              {dateLabel(latest.created_at)} · {horizonLabel(latest.horizon_days)} · {latest.product_count} producto(s)
            </p>
            {latest.summary ? (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Stat label="Demanda proyectada" value={`${num(latest.summary.total_forecast_units)} u`} />
                <Stat label="Próximo periodo" value={`${num(latest.summary.next_period_units)} u`} />
                <Stat label="Con FTGM" value={`${latest.summary.products_ok}`} />
                <Stat label="Con baseline" value={`${latest.summary.products_fallback}`} />
              </div>
            ) : (
              <Badge variant={runStatusMeta[latest.status]?.tone ?? "default"} dot>
                {runStatusMeta[latest.status]?.label ?? latest.status}
              </Badge>
            )}
          </>
        ) : (
          <>
            <h3 className="font-display text-lg font-semibold text-text-primary">Anticipa tu demanda</h3>
            <p className="mt-1 text-sm text-text-secondary">
              El motor FTGM lee tus ventas, repara los quiebres de stock y proyecta cuánto venderás de cada producto.
              {!isPremium && " Pruébalo gratis con un producto."}
            </p>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {latest ? (
          <Link href={`/forecasting/${latest.id}`} className="btn btn-violet h-10 gap-2 px-4 text-sm">
            Ver resultado <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link href="/forecasting" className="btn btn-violet h-10 gap-2 px-4 text-sm">
            {isPremium ? "Pronosticar mi catálogo" : "Probar con 1 producto"} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        {!isPremium && (
          <Link href="/premium" className="btn btn-ghost h-10 gap-2 px-4 text-sm">
            <Crown className="h-4 w-4" /> Premium
          </Link>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <p className="text-[10.5px] text-text-muted">{label}</p>
      <p className="font-display text-sm font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}
