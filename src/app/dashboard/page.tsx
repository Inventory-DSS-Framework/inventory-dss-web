"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Crown,
  Lightbulb,
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
import { dateLabel, horizonLabel, num, runStatusMeta, forWhen } from "@/components/ftgm/labels";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useBrandColors } from "@/hooks/useBrandColors";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useExpertMode } from "@/hooks/useExpertMode";
import { usePlan } from "@/hooks/usePlan";
import { recommendationsApi } from "@/lib/api";
import { dashboardApi, ftgmApi } from "@/lib/apis/ftgm";

export default function DashboardPage() {
  const companyId = useCompanyId();
  const colors = useBrandColors();
  const { isPremium } = usePlan();
  const [expert] = useExpertMode();
  const summary = useApi(() => (companyId ? dashboardApi.erpSummary(companyId) : Promise.resolve(null)), [companyId]);
  const runs = useApi(() => (companyId ? ftgmApi.listRuns(companyId, 5).catch(() => []) : Promise.resolve([])), [companyId]);
  const recs = useApi(
    () => (companyId ? recommendationsApi.list(companyId).catch(() => []) : Promise.resolve([])),
    [companyId],
  );
  const s = summary.data;
  const latest = (runs.data ?? [])[0];
  const latestOk = (runs.data ?? []).find((r) => r.status === "success");
  const pendingRecs = (recs.data ?? []).filter((r) => r.status === "pending");
  const urgentRecs = pendingRecs.filter((r) => r.priority === "high").length;

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
            {/* Hoy: the three things an owner checks first. */}
            <section className="space-y-3">
              <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">Hoy</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <TodayCard
                  icon={Receipt}
                  label="Ventas de hoy"
                  value={soles(s.revenue_today)}
                  explain={
                    s.tickets_today > 0
                      ? `Vendiste ${s.tickets_today} ${s.tickets_today === 1 ? "vez" : "veces"} hoy (${num(s.units_today)} productos).`
                      : "Todavía no registras ventas hoy."
                  }
                  href="/sales"
                  cta="Ver mis ventas"
                />
                <TodayCard
                  icon={PackageMinus}
                  label="Productos por acabarse"
                  value={`${s.low_stock_count}`}
                  tone={s.out_of_stock_count ? "danger" : s.low_stock_count ? "warning" : undefined}
                  explain={
                    s.low_stock_count === 0 && s.out_of_stock_count === 0
                      ? "Tienes stock suficiente de todo. ¡Bien!"
                      : s.out_of_stock_count > 0
                        ? `${s.out_of_stock_count} ya se ${s.out_of_stock_count === 1 ? "acabó" : "acabaron"}. Revisa cuáles y repón.`
                        : "Te quedan pocas unidades. Revisa cuáles y repón pronto."
                  }
                  href="/inventory"
                  cta="Ver cuáles son"
                />
                <TodayCard
                  icon={Lightbulb}
                  label="Qué comprar"
                  value={`${pendingRecs.length}`}
                  tone={urgentRecs ? "danger" : pendingRecs.length ? "warning" : undefined}
                  explain={
                    pendingRecs.length === 0
                      ? "No tienes compras pendientes. Calcula cuánto venderás para recibir sugerencias."
                      : urgentRecs > 0
                        ? `${pendingRecs.length} producto(s) por comprar; ${urgentRecs} ${urgentRecs === 1 ? "es urgente" : "son urgentes"}.`
                        : `${pendingRecs.length} producto(s) que te conviene comprar pronto.`
                  }
                  href={pendingRecs.length === 0 ? "/forecasting" : "/recommendations"}
                  cta={pendingRecs.length === 0 ? "Calcular cuánto venderé" : "Ver qué comprar"}
                />
              </div>
            </section>

            <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-text-primary">Así va tu negocio</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tile
                icon={Wallet}
                label="Ventas del último mes"
                value={soles(s.revenue_30d)}
                hint={`Última semana: ${soles(s.revenue_7d)}`}
                change={s.revenue_change_pct}
              />
              <Tile
                icon={ShoppingBag}
                label={expert ? "Ticket promedio (30 d)" : "Gasto promedio por venta"}
                value={s.avg_ticket_30d != null ? soles(s.avg_ticket_30d) : "—"}
                hint={expert ? `${num(s.tickets_30d)} tickets` : `En ${num(s.tickets_30d)} ventas del último mes`}
              />
              <Tile
                icon={Warehouse}
                label={expert ? "Inventario a costo" : "Lo que vale tu mercadería"}
                value={soles(s.inventory_value)}
                hint={expert ? `${s.active_products} productos activos` : `A precio de compra · ${s.active_products} productos`}
              />
              <Tile
                icon={Truck}
                label="Lo que compraste este mes"
                value={soles(s.purchases_month_total)}
                hint={`${s.purchases_month_count} compra(s) registrada(s)`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MiniTile
                icon={PackageX}
                label="Productos que ya se acabaron"
                value={`${s.out_of_stock_count}`}
                hint={s.out_of_stock_count ? "Repónlos para no perder ventas." : "Ninguno. ¡Bien!"}
                tone={s.out_of_stock_count ? "danger" : undefined}
              />
              <MiniTile
                icon={AlertTriangle}
                label={expert ? "Ventas perdidas (30 d)" : "Ventas que perdiste por no tener stock (último mes)"}
                value={`${s.lost_sales_30d_attempts}`}
                hint={
                  expert
                    ? `${num(s.lost_sales_30d_units)} u no vendidas por quiebre`
                    : `${num(s.lost_sales_30d_units)} unidades que te pidieron y no tenías`
                }
                tone={s.lost_sales_30d_attempts ? "danger" : undefined}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-text-primary">Cuánto vendiste cada día</h3>
                    <p className="text-xs text-text-secondary">
                      {expert
                        ? "Últimos 30 días · incluye tickets del POS y ventas importadas."
                        : "Último mes. Cada barra es lo que vendiste ese día, en soles."}
                    </p>
                  </div>
                  {expert && (
                    <div className="flex gap-2">
                      <LegendChip color={colors.primary} label="Ingresos" />
                      <LegendChip color={colors.accent} label="Tickets" />
                    </div>
                  )}
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
                      <YAxis
                        yAxisId="t"
                        orientation="right"
                        hide={!expert}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: colors.muted, fontSize: 11 }}
                        width={30}
                      />
                      <Tooltip
                        cursor={{ fill: colors.grid, fillOpacity: 0.4 }}
                        content={
                          <ChartTooltip
                            names={{ revenue: expert ? "Ingresos" : "Vendiste", tickets: expert ? "Tickets" : "Ventas", units: "Unidades" }}
                            format={(k, v) => (k === "revenue" ? soles(Number(v)) : num(Number(v)))}
                            labelFormat={dateLabel}
                          />
                        }
                      />
                      <Bar yAxisId="r" dataKey="revenue" fill={colors.primary} fillOpacity={0.8} radius={[5, 5, 0, 0]} maxBarSize={22} />
                      {/* The ticket-count line is a second axis: only for expert mode. */}
                      <Line
                        yAxisId="t"
                        dataKey="tickets"
                        stroke={expert ? colors.accent : "transparent"}
                        strokeWidth={2}
                        dot={false}
                        activeDot={expert ? undefined : false}
                      />
                      <Line yAxisId="t" dataKey="units" stroke="transparent" dot={false} activeDot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <FtgmCard isPremium={isPremium} latest={latestOk ?? latest} expert={expert} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <Header
                  title="Productos que se están acabando"
                  subtitle={expert ? "En o por debajo del stock de seguridad." : "Te quedan pocas unidades. Repón antes de que se acaben."}
                  href="/inventory"
                />
                {s.low_stock.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">Tienes stock suficiente de todos tus productos.</p>
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
                          {expert ? (
                            <p className="font-mono text-[11px] text-text-muted">
                              {p.sku} · seguridad {p.safety_stock} · reorden {p.reorder_point}
                            </p>
                          ) : (
                            <p className="text-[11px] text-text-muted">
                              {p.on_hand <= 0
                                ? "Se acabó. Repón cuanto antes."
                                : `Lo ideal es tener al menos ${p.safety_stock} en tu tienda.`}
                            </p>
                          )}
                        </div>
                        <Badge variant={p.on_hand <= 0 ? "danger" : "warning"} dot>
                          {p.on_hand <= 0 ? "Se acabó" : `Quedan ${p.on_hand}`}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <Header title="Lo que más vendes" subtitle="Último mes, ordenado por lo que te dejó en soles." href="/sales" />
                {s.top_products.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">Aún no hay ventas en el último mes.</p>
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

function TodayCard({
  icon: Icon,
  label,
  value,
  explain,
  href,
  cta,
  tone,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  explain: string;
  href: string;
  cta: string;
  tone?: "warning" | "danger";
}) {
  return (
    <Card interactive particle className="flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <span
          className={cn(
            "rounded-xl p-2.5",
            tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div>
        <p className="font-display text-[40px] font-semibold leading-none tracking-[-0.035em] text-text-primary tabular-nums">{value}</p>
        <p className="mt-2 text-sm text-text-secondary">{explain}</p>
      </div>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover">
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
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
              {change.toFixed(1)}% vs mes anterior
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

function FtgmCard({
  isPremium,
  latest,
  expert,
}: {
  isPremium: boolean;
  latest?: import("@/types/ftgm").FtgmRun;
  expert: boolean;
}) {
  return (
    <Card className="flex flex-col justify-between gap-5 border-accent-violet/25 bg-accent-violet-soft/15">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-violet-soft px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent-violet">
          <Sparkles className="h-3 w-3" /> Motor FTGM
        </div>
        {latest ? (
          <>
            <h3 className="font-display text-lg font-semibold text-text-primary">
              {expert ? latest.scope_description ?? "Último pronóstico" : "¿Cuánto venderé?"}
            </h3>
            <p className="text-xs text-text-muted">
              {expert
                ? `${dateLabel(latest.created_at)} · ${horizonLabel(latest.horizon_days)} · ${latest.product_count} producto(s)`
                : `Calculado el ${dateLabel(latest.created_at)} para ${latest.product_count} producto(s).`}
            </p>
            {latest.summary ? (
              expert ? (
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <Stat label="Demanda proyectada" value={`${num(latest.summary.total_forecast_units)} u`} />
                  <Stat label="Próximo periodo" value={`${num(latest.summary.next_period_units)} u`} />
                  <Stat label="Con FTGM" value={`${latest.summary.products_ok}`} />
                  <Stat label="Con baseline" value={`${latest.summary.products_fallback}`} />
                </div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  <Stat
                    label={`Venderías ${forWhen(latest.horizon_days)}`}
                    value={`${num(latest.summary.total_forecast_units)} unidades`}
                  />
                  {latest.summary.median_accuracy_pct != null && (
                    <Stat
                      label="Qué tan seguro es"
                      value={`Acierta ~${Math.round(latest.summary.median_accuracy_pct)}% con tus ventas pasadas`}
                    />
                  )}
                </div>
              )
            ) : (
              <Badge variant={runStatusMeta[latest.status]?.tone ?? "default"} dot>
                {runStatusMeta[latest.status]?.label ?? latest.status}
              </Badge>
            )}
          </>
        ) : (
          <>
            <h3 className="font-display text-lg font-semibold text-text-primary">¿Cuánto venderé?</h3>
            <p className="mt-1 text-sm text-text-secondary">
              El motor FTGM mira tus ventas pasadas y te dice cuánto venderás de cada producto, para que compres lo justo.
              {!isPremium && " Pruébalo gratis con un producto."}
            </p>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {latest ? (
          <Link href={`/forecasting/${latest.id}`} className="btn btn-violet h-10 gap-2 px-4 text-sm">
            Ver el resultado <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link href="/forecasting" className="btn btn-violet h-10 gap-2 px-4 text-sm">
            {isPremium ? "Calcular cuánto venderé" : "Probar con 1 producto"} <ArrowRight className="h-4 w-4" />
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
