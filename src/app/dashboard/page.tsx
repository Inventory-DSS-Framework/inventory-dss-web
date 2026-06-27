"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { Package, CheckCircle, Activity, TrendingDown, ShoppingCart } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { forecastingApi, kpisApi, productsApi, recommendationsApi } from "@/lib/api";

export default function DashboardPage() {
  const companyId = useCompanyId();

  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const recs = useApi(() => (companyId ? recommendationsApi.list(companyId, true) : Promise.resolve([])), [companyId]);
  const kpis = useApi(() => (companyId ? kpisApi.list(companyId) : Promise.resolve([])), [companyId]);
  const runs = useApi(() => (companyId ? forecastingApi.listRuns(companyId) : Promise.resolve([])), [companyId]);

  const activeProducts = (products.data ?? []).filter((p) => p.is_active).length;
  const pendingRecs = recs.data ?? [];
  const latestRun = (runs.data ?? [])[0];

  const avgStockoutRisk = useMemo(() => {
    const values = (kpis.data ?? []).filter((k) => k.kpi_type === "stockout_risk").map((k) => Number(k.value));
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [kpis.data]);

  const loading = products.loading || recs.loading || kpis.loading || runs.loading;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Inicio"
        title="Panel de control"
        description="Resumen del estado del inventario y la inteligencia del DSS."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Productos activos" value={String(activeProducts)} icon={Package} accent="primary" />
        <StatCard title="Recomendaciones pendientes" value={String(pendingRecs.length)} icon={ShoppingCart} accent="violet" />
        <StatCard title="Riesgo de quiebre medio" value={avgStockoutRisk.toFixed(1)} suffix="%" icon={TrendingDown} accent="danger" />
        <StatCard
          title="Último pronóstico"
          value={latestRun ? latestRun.status : "—"}
          icon={Activity}
          accent="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text-primary">Próximas acciones sugeridas</h3>
          </div>
          <DataState
            loading={recs.loading}
            error={recs.error}
            empty={pendingRecs.length === 0}
            emptyMessage="Sin recomendaciones pendientes."
            onRetry={recs.reload}
          >
            <div className="space-y-3">
              {pendingRecs.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-surface-soft rounded-2xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.reason}</p>
                    <p className="text-xs text-text-muted mt-0.5">Sugerido: {r.recommended_quantity} uds.</p>
                  </div>
                  <Badge variant={r.priority === "high" ? "danger" : r.priority === "medium" ? "warning" : "primary"} dot>
                    {r.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </DataState>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-accent-violet" />
            <h3 className="font-semibold text-text-primary">Pronósticos recientes</h3>
          </div>
          <DataState
            loading={runs.loading}
            error={runs.error}
            empty={(runs.data ?? []).length === 0}
            emptyMessage="Aún no se han ejecutado pronósticos."
            onRetry={runs.reload}
          >
            <div className="space-y-3">
              {(runs.data ?? []).slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center justify-between bg-surface-soft rounded-2xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{run.model_name} · {run.horizon_days}d</p>
                    <p className="text-xs text-text-muted mt-0.5 font-mono">{run.id.slice(0, 8)}</p>
                  </div>
                  <Badge
                    variant={run.status === "success" ? "success" : run.status === "failed" ? "danger" : "warning"}
                    dot
                  >
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          </DataState>
        </Card>
      </div>

      {!loading && (products.error || kpis.error) && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Algunos datos no pudieron cargarse. Verifica que el backend esté disponible.
        </div>
      )}

      <div className="flex items-center gap-2 text-success text-sm">
        <CheckCircle className="w-4 h-4" />
        Conectado al backend del DSS.
      </div>
    </div>
  );
}
