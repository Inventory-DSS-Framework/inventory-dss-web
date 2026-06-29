"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { Package, ShoppingCart, TrendingDown, Gauge, BarChart3, Activity, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useBrandColors } from "@/hooks/useBrandColors";
import { forecastingApi, kpisApi, productsApi, recommendationsApi, salesApi } from "@/lib/api";
import type { ChartDataPoint } from "@/types";
import type { ForecastResultDTO, SaleDTO } from "@/types/api";

const monthKey = (iso: string) => iso.slice(0, 7);
const units = (v: number) => `${v.toFixed(0)} u`;

function salesByMonth(sales: SaleDTO[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sales) m.set(monthKey(s.sale_date), (m.get(monthKey(s.sale_date)) ?? 0) + s.quantity);
  return m;
}
function forecastByMonth(results: ForecastResultDTO[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of results)
    for (const p of r.points) m.set(monthKey(p.period_date), (m.get(monthKey(p.period_date)) ?? 0) + Number(p.predicted_demand));
  return m;
}

function buildDemandChart(sales: Map<string, number>, forecast: Map<string, number>): ChartDataPoint[] {
  const actualMonths = [...sales.keys()].sort().slice(-8);
  const forecastMonths = [...forecast.keys()].sort();
  const rows: { name: string; actual?: number; forecast?: number }[] = actualMonths.map((k) => ({
    name: k,
    actual: sales.get(k),
  }));
  // Bridge the two lines so the forecast visually continues from the last real point.
  if (rows.length && forecastMonths.length) rows[rows.length - 1].forecast = sales.get(actualMonths[actualMonths.length - 1]);
  for (const k of forecastMonths) rows.push({ name: k, forecast: forecast.get(k) });
  return rows as unknown as ChartDataPoint[];
}

export default function DashboardPage() {
  const companyId = useCompanyId();
  const colors = useBrandColors();

  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const kpis = useApi(() => (companyId ? kpisApi.list(companyId) : Promise.resolve([])), [companyId]);
  const recs = useApi(() => (companyId ? recommendationsApi.list(companyId, true) : Promise.resolve([])), [companyId]);
  const runs = useApi(() => (companyId ? forecastingApi.listRuns(companyId) : Promise.resolve([])), [companyId]);
  const sales = useApi(() => (companyId ? salesApi.list(companyId) : Promise.resolve([])), [companyId]);

  const latestSuccess = (runs.data ?? []).find((r) => r.status === "success");
  const results = useApi(
    () => (companyId && latestSuccess ? forecastingApi.runResults(companyId, latestSuccess.id) : Promise.resolve([])),
    [companyId, latestSuccess?.id],
  );

  const skuOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p.sku]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [products.data]);

  const activeProducts = (products.data ?? []).filter((p) => p.is_active).length;
  const pendingRecs = recs.data ?? [];

  const avg = (type: string) => {
    const vals = (kpis.data ?? []).filter((k) => k.kpi_type === type).map((k) => Number(k.value));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const avgStockout = avg("stockout_risk");
  const avgCoverage = avg("coverage_days");

  const chartData = useMemo(
    () => buildDemandChart(salesByMonth(sales.data ?? []), forecastByMonth(results.data ?? [])),
    [sales.data, results.data],
  );

  const riskBars = useMemo(
    () =>
      (kpis.data ?? [])
        .filter((k) => k.kpi_type === "stockout_risk")
        .map((k) => ({ product_id: k.product_id, value: Math.max(0, Math.min(100, Number(k.value))) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [kpis.data],
  );

  const anyError = products.error || kpis.error || runs.error;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Inicio"
        title="Panel de control"
        description="Estado del inventario y la inteligencia del DSS, en un vistazo."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard particle title="Productos activos" value={String(activeProducts)} icon={Package} accent="primary" />
        <StatCard particle title="Recomendaciones pendientes" value={String(pendingRecs.length)} icon={ShoppingCart} accent="violet" />
        <StatCard particle title="Riesgo de quiebre medio" value={avgStockout.toFixed(1)} suffix="%" icon={TrendingDown} accent="danger" />
        <StatCard particle title="Cobertura media" value={avgCoverage.toFixed(0)} suffix=" d" icon={Gauge} accent="success" />
      </div>

      {/* Demand vs forecast + stockout risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {chartData.length > 0 ? (
            <LineChartCard
              title="Demanda observada vs. pronóstico"
              subtitle="Unidades por mes — histórico real frente a la predicción del modelo FTGM."
              data={chartData}
              labelPrefix=""
              valueFormatter={units}
              height={280}
              lines={[
                { dataKey: "actual", name: "Demanda real", stroke: colors.primary },
                { dataKey: "forecast", name: "Pronóstico FTGM", stroke: colors.accent, dashed: true, fill: false },
              ]}
            />
          ) : (
            <Card className="flex flex-col items-center justify-center text-center h-full min-h-[280px] gap-2">
              <BarChart3 className="w-8 h-8 text-text-muted" />
              <p className="font-display font-semibold text-text-primary">Sin datos de demanda todavía</p>
              <p className="text-sm text-text-secondary max-w-sm">
                Carga ventas en Ingesta y ejecuta un pronóstico para ver aquí la demanda real frente a la predicción.
              </p>
            </Card>
          )}
        </div>

        <Card particle>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-text-primary">Riesgo de quiebre</h3>
          </div>
          <p className="text-xs text-text-secondary mt-1 mb-5">
            Productos con mayor probabilidad de quedarse sin stock.
          </p>
          {riskBars.length === 0 ? (
            <p className="text-sm text-text-muted py-10 text-center">Calcula los KPIs para ver el riesgo por producto.</p>
          ) : (
            <div className="space-y-3.5">
              {riskBars.map((b) => (
                <div key={b.product_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-text-secondary">{skuOf(b.product_id)}</span>
                    <span className="text-xs font-semibold text-text-primary tabular-nums">{b.value.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", b.value >= 50 ? "bg-danger" : b.value >= 20 ? "bg-warning" : "bg-success")}
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Pending actions + recent runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card particle>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-accent-violet" />
              <h3 className="font-display font-semibold text-text-primary">Próximas acciones</h3>
            </div>
            <Link href="/recommendations" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-text-secondary mb-4">Recomendaciones de reabastecimiento pendientes de revisión.</p>
          <DataState loading={recs.loading} error={recs.error} empty={pendingRecs.length === 0} emptyMessage="Sin recomendaciones pendientes." onRetry={recs.reload}>
            <div className="space-y-2.5">
              {pendingRecs.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 bg-surface-soft rounded-2xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{skuOf(r.product_id)}</p>
                    <p className="text-xs text-text-muted truncate">{r.reason} · {r.recommended_quantity} uds.</p>
                  </div>
                  <Badge variant={r.priority === "high" ? "danger" : r.priority === "medium" ? "warning" : "primary"} dot>
                    {r.priority === "high" ? "Alta" : r.priority === "medium" ? "Media" : "Baja"}
                  </Badge>
                </div>
              ))}
            </div>
          </DataState>
        </Card>

        <Card particle>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold text-text-primary">Pronósticos recientes</h3>
            </div>
            <Link href="/forecasting" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-text-secondary mb-4">Últimas ejecuciones del motor FTGM.</p>
          <DataState loading={runs.loading} error={runs.error} empty={(runs.data ?? []).length === 0} emptyMessage="Aún no se han ejecutado pronósticos." onRetry={runs.reload}>
            <div className="space-y-2.5">
              {(runs.data ?? []).slice(0, 5).map((run) => (
                <Link key={run.id} href={`/forecasting/${run.id}`} className="flex items-center justify-between gap-3 bg-surface-soft hover:bg-surface-muted rounded-2xl px-4 py-3 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{run.model_name} · {run.horizon_days} días</p>
                    <p className="text-xs text-text-muted font-mono">{run.id.slice(0, 8)}</p>
                  </div>
                  <Badge variant={run.status === "success" ? "success" : run.status === "failed" ? "danger" : run.status === "running" ? "primary" : "default"} dot>
                    {run.status}
                  </Badge>
                </Link>
              ))}
            </div>
          </DataState>
        </Card>
      </div>

      {anyError && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Algunos datos no pudieron cargarse. Verifica que el backend esté disponible.
        </div>
      )}
    </div>
  );
}
