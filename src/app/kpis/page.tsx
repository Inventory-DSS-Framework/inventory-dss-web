"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart2, CalendarClock, PackageMinus, PiggyBank, RefreshCcw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ACTIONS, type ActionId } from "@/components/ftgm/decisions";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useExpertMode } from "@/hooks/useExpertMode";
import { kpisApi, productsApi } from "@/lib/api";
import type { KpiDTO, KpiType } from "@/types/api";

/** Technical names, shown only in expert mode. */
const KPI_LABEL: Record<KpiType, string> = {
  coverage_days: "Cobertura",
  stockout_risk: "Riesgo de quiebre",
  turnover: "Rotación",
  overstock_risk: "Riesgo de sobrestock",
};

interface Row {
  product_id: string;
  values: Partial<Record<KpiType, number>>;
  computed_at: string;
}

type Level = "Alto" | "Medio" | "Bajo";
const level = (v: number | undefined): Level | null => (v == null ? null : v >= 50 ? "Alto" : v >= 20 ? "Medio" : "Bajo");

/** One plain action per product, worded like the forecast result screen. */
function actionFor(r: Row): ActionId {
  const out = r.values.stockout_risk ?? 0;
  // stockout_risk is the shortfall over (supplier wait + 2 weeks): any shortfall means buy;
  // above ~2/3 the stock won't even last the supplier's wait.
  if ((r.values.coverage_days ?? 1) <= 0 || out >= 65) return "reponer_ya";
  if (out > 0) return "reponer";
  // The API only flags stock beyond ~4 months of sales, so any overstock means "don't buy".
  if ((r.values.overstock_risk ?? 0) > 0) return "no_comprar";
  return "mantener";
}

export default function KPIsPage() {
  const companyId = useCompanyId();
  const [expert] = useExpertMode();
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "risk" | "overstock">("all");

  const kpis = useApi(() => (companyId ? kpisApi.list(companyId) : Promise.resolve([])), [companyId]);
  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const productOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products.data]);

  // Latest value per (product, type), pivoted to one row per product.
  const rows = useMemo(() => {
    const latest = new Map<string, KpiDTO>();
    for (const k of kpis.data ?? []) {
      const key = `${k.product_id}:${k.kpi_type}`;
      const prev = latest.get(key);
      if (!prev || k.computed_at > prev.computed_at) latest.set(key, k);
    }
    const byProduct = new Map<string, Row>();
    for (const k of latest.values()) {
      const row = byProduct.get(k.product_id) ?? { product_id: k.product_id, values: {}, computed_at: k.computed_at };
      row.values[k.kpi_type] = Number(k.value);
      if (k.computed_at > row.computed_at) row.computed_at = k.computed_at;
      byProduct.set(k.product_id, row);
    }
    return [...byProduct.values()].sort((a, b) => (b.values.stockout_risk ?? 0) - (a.values.stockout_risk ?? 0));
  }, [kpis.data]);

  const avg = (t: KpiType) => {
    const v = rows.map((r) => r.values[t]).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };
  const running = rows.filter((r) => ["reponer_ya", "reponer"].includes(actionFor(r))).length;
  const surplus = rows.filter((r) => actionFor(r) === "no_comprar").length;
  const avgCover = Math.round(avg("coverage_days"));

  const shown = rows.filter((r) =>
    filter === "risk"
      ? ["reponer_ya", "reponer"].includes(actionFor(r))
      : filter === "overstock"
        ? actionFor(r) === "no_comprar"
        : true,
  );

  const handleCalculate = async () => {
    if (!companyId) return;
    setWorking(true);
    setActionError(null);
    try {
      await kpisApi.calculate(companyId);
      kpis.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo calcular");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="Planifica tus compras"
        eyebrowTone="violet"
        title={expert ? "Indicadores de inventario" : "Mis números"}
        description={
          expert
            ? "Cobertura, riesgo de quiebre, sobrestock y rotación de cada producto, calculados con su pronóstico de IA más reciente."
            : "Cómo está el stock de cada producto, comparado con lo que calculamos que vas a vender."
        }
        action={
          <Button variant="violet" onClick={handleCalculate} loading={working}>
            <Sparkles className="h-4 w-4" /> {expert ? "Recalcular KPIs" : "Actualizar mis números"}
          </Button>
        }
      />

      {actionError && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{actionError}</div>}

      {expert ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Cobertura media" value={avg("coverage_days").toFixed(1)} suffix=" d" icon={BarChart2} accent="violet" />
          <StatCard title="Riesgo de quiebre medio" value={avg("stockout_risk").toFixed(1)} suffix="%" icon={TrendingDown} accent="danger" />
          <StatCard title="Riesgo de sobrestock medio" value={avg("overstock_risk").toFixed(1)} suffix="%" icon={TrendingUp} accent="warning" />
          <StatCard title="Rotación media" value={avg("turnover").toFixed(2)} suffix="x" icon={RefreshCcw} accent="primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <MetricCard
            icon={CalendarClock}
            accent="violet"
            title="Para cuántos días me alcanza"
            value={rows.length ? `${avgCover} días` : "—"}
            explain="En promedio, con el stock que tienes hoy y lo que vendes."
            todo="Si es menos de lo que tarda tu proveedor en entregarte, haz tu pedido ya."
          />
          <MetricCard
            icon={PackageMinus}
            accent="danger"
            title="Productos que se están acabando"
            value={`${running}`}
            explain="Productos con alta probabilidad de quedarse sin stock pronto."
            todo="Revisa “Qué comprar” y haz el pedido de estos primero."
            href={running ? "/recommendations" : undefined}
          />
          <MetricCard
            icon={PiggyBank}
            accent="warning"
            title="Plata inmovilizada en productos que no se venden"
            value={`${surplus}`}
            explain="Productos de los que tienes mucho más de lo que vas a vender."
            todo="No compres más de estos; una promoción te ayuda a venderlos."
          />
        </div>
      )}

      <DataState
        loading={kpis.loading}
        error={kpis.error}
        empty={rows.length === 0}
        onRetry={kpis.reload}
        emptyState={
          <EmptyState
            icon={BarChart2}
            title="Aún no hay números"
            description="Aparecen solos cuando calculas cuánto venderás. También puedes actualizarlos con el botón."
            action={{ label: "Calcular cuánto venderé", href: "/forecasting" }}
          />
        }
      >
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h3 className="font-display text-[15px] font-semibold text-text-primary">{expert ? "KPIs por producto" : "Producto por producto"}</h3>
            <div className="w-56">
              <Select
                size="sm"
                value={filter}
                onChange={(v) => setFilter(v as typeof filter)}
                options={
                  expert
                    ? [
                        { value: "all", label: "Todos los productos" },
                        { value: "risk", label: "Riesgo de quiebre ≥ 50%" },
                        { value: "overstock", label: "Sobrestock ≥ 50%" },
                      ]
                    : [
                        { value: "all", label: "Todos los productos" },
                        { value: "risk", label: "Se están acabando" },
                        { value: "overstock", label: "Tengo de más" },
                      ]
                }
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  <th className="px-6 py-3">Producto</th>
                  {expert ? (
                    <>
                      <th className="px-4 py-3">{KPI_LABEL.coverage_days}</th>
                      <th className="px-4 py-3">{KPI_LABEL.stockout_risk}</th>
                      <th className="px-4 py-3">{KPI_LABEL.overstock_risk}</th>
                      <th className="px-4 py-3">{KPI_LABEL.turnover}</th>
                      <th className="px-4 py-3">Calculado</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3">Te alcanza para</th>
                      <th className="px-4 py-3">¿Se puede acabar?</th>
                      <th className="px-4 py-3">¿Tienes de más?</th>
                      <th className="px-4 py-3">¿Qué hago?</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shown.map((r) => {
                  const p = productOf(r.product_id);
                  const act = ACTIONS[actionFor(r)];
                  return (
                    <tr key={r.product_id} className="hover:bg-accent-violet-soft/10">
                      <td className="px-6 py-3">
                        {p ? (
                          <Link href={`/inventory/${p.id}`} className="block max-w-[280px] truncate font-medium text-text-primary hover:text-accent-violet">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="font-mono text-text-secondary">{r.product_id.slice(0, 8)}</span>
                        )}
                        {p && expert && <span className="font-mono text-[11px] text-text-muted">{p.sku}</span>}
                      </td>
                      {expert ? (
                        <>
                          <td className="px-4 py-3 tabular-nums">{r.values.coverage_days != null ? `${r.values.coverage_days.toFixed(0)} d` : "—"}</td>
                          <td className="px-4 py-3">
                            <RiskBar value={r.values.stockout_risk} tone="danger" />
                          </td>
                          <td className="px-4 py-3">
                            <RiskBar value={r.values.overstock_risk} tone="warning" />
                          </td>
                          <td className="px-4 py-3 tabular-nums">{r.values.turnover != null ? `${r.values.turnover.toFixed(2)}x` : "—"}</td>
                          <td className="px-4 py-3 text-xs text-text-muted">{r.computed_at.slice(0, 10)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 tabular-nums">
                            {r.values.coverage_days != null ? `${r.values.coverage_days.toFixed(0)} días` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <LevelBadge value={r.values.stockout_risk} bad="danger" />
                          </td>
                          <td className="px-4 py-3">
                            <LevelBadge value={r.values.overstock_risk} bad="warning" />
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={act.tone} dot>
                              {act.title}
                            </Badge>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-text-muted">
                      <Badge>Sin productos para este filtro</Badge>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </DataState>
    </div>
  );
}

const accentStyles = {
  violet: "bg-accent-violet-soft text-accent-violet",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
} as const;

function MetricCard({
  icon: Icon,
  accent,
  title,
  value,
  explain,
  todo,
  href,
}: {
  icon: typeof BarChart2;
  accent: keyof typeof accentStyles;
  title: string;
  value: string;
  explain: string;
  todo: string;
  href?: string;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug text-text-primary">{title}</h3>
        <span className={cn("shrink-0 rounded-xl p-2.5", accentStyles[accent])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div>
        <p className="font-display text-[32px] font-semibold leading-none tracking-[-0.035em] text-text-primary tabular-nums">{value}</p>
        <p className="mt-2 text-xs text-text-secondary">{explain}</p>
      </div>
      <div className="mt-auto rounded-xl bg-surface-soft px-3 py-2 text-xs text-text-secondary">
        <span className="font-semibold text-text-primary">¿Qué hago? </span>
        {todo}
        {href && (
          <Link href={href} className="ml-1 font-semibold text-accent-violet hover:opacity-80">
            Ir ahora →
          </Link>
        )}
      </div>
    </Card>
  );
}

function LevelBadge({ value, bad }: { value: number | undefined; bad: "danger" | "warning" }) {
  const l = level(value);
  if (!l) return <span className="text-text-muted">—</span>;
  const tone = l === "Alto" ? bad : l === "Medio" ? "warning" : "success";
  return (
    <Badge variant={tone} dot>
      {l === "Alto" ? "Sí, mucho" : l === "Medio" ? "Un poco" : "No"}
    </Badge>
  );
}

function RiskBar({ value, tone }: { value: number | undefined; tone: "danger" | "warning" }) {
  if (value == null) return <span className="text-text-muted">—</span>;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn("h-full rounded-full", v >= 50 ? (tone === "danger" ? "bg-danger" : "bg-warning") : v >= 20 ? "bg-warning" : "bg-success")}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="w-10 text-xs tabular-nums text-text-secondary">{v.toFixed(0)}%</span>
    </div>
  );
}
