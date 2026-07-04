"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Badge } from "@/components/ui/Table";
import { CircularGauge } from "@/components/ui/CircularGauge";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { DataState } from "@/components/ui/DataState";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { forecastingApi, productsApi } from "@/lib/api";
import type { ChartDataPoint } from "@/types";
import type { RunStatus } from "@/types/api";

const fmtUnits = (v: number) => `${v.toFixed(0)} und`;

const statusVariant: Record<RunStatus, "default" | "success" | "warning" | "danger" | "primary"> = {
  pending: "default",
  running: "primary",
  success: "success",
  failed: "danger",
  cancelled: "warning",
};
const statusLabel: Record<RunStatus, string> = {
  pending: "Pendiente",
  running: "En curso",
  success: "Completado",
  failed: "Fallido",
  cancelled: "Cancelado",
};

export default function ForecastRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = String(params.runId);
  const companyId = useCompanyId();

  const run = useApi(
    () => (companyId ? forecastingApi.getRun(companyId, runId) : Promise.resolve(null)),
    [companyId, runId],
  );
  const results = useApi(
    () => (companyId ? forecastingApi.runResults(companyId, runId) : Promise.resolve([])),
    [companyId, runId],
  );
  const metrics = useApi(
    () => (companyId ? forecastingApi.runMetrics(companyId, runId) : Promise.resolve([])),
    [companyId, runId],
  );
  const products = useApi(
    () => (companyId ? productsApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );

  // Live view: while the run is pending/running, poll status + results.
  const isActive = run.data?.status === "pending" || run.data?.status === "running";
  const reloadAll = useRef(() => {});
  reloadAll.current = () => {
    run.reload();
    results.reload();
    metrics.reload();
  };
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => reloadAll.current(), 2500);
    return () => clearInterval(t);
  }, [isActive]);

  const productName = useMemo(() => {
    const map = new Map<string, { sku: string; name: string }>();
    for (const p of products.data ?? []) map.set(p.id, { sku: p.sku, name: p.name });
    return (id: string) => map.get(id) ?? { sku: id.slice(0, 8), name: "" };
  }, [products.data]);

  const items = results.data ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? items[0]?.product_id ?? null;
  const activeResult = items.find((p) => p.product_id === activeId);
  const activeMetrics = (metrics.data ?? []).find((m) => m.product_id === activeId);

  // Chart: in-sample history (real + model fit) followed by the forecast with its band.
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const rows: ChartDataPoint[] = [];
    for (const h of activeResult?.history ?? []) {
      const row: ChartDataPoint = { name: h.period_date.slice(0, 7), real: Number(h.cleaned) };
      if (h.fitted != null) row.fitted = Number(h.fitted);
      rows.push(row);
    }
    for (const p of activeResult?.points ?? []) {
      const row: ChartDataPoint = { name: p.period_date.slice(0, 7), pred: Number(p.predicted_demand) };
      if (p.lower_bound != null) row.lower = Number(p.lower_bound);
      if (p.upper_bound != null) row.upper = Number(p.upper_bound);
      rows.push(row);
    }
    return rows;
  }, [activeResult]);

  const mape = activeMetrics && activeMetrics.mape != null ? Number(activeMetrics.mape) : null;
  const precision = mape != null ? Math.max(0, Math.min(100, 100 - mape)) : null;
  const usedFallback = activeMetrics?.status === "fallback";
  const skipped = activeMetrics?.status === "skipped";

  const runInfo = run.data
    ? `${run.data.model_name} · ${run.data.horizon_days} días · dataset ${run.data.dataset_id?.slice(0, 8) ?? "—"}`
    : "Cargando ejecución…";

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <Link
        href="/forecasting"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a pronósticos
      </Link>

      <PageHeader
        eyebrow="Pronóstico"
        title="Detalle de la ejecución"
        description={runInfo}
        action={
          run.data ? (
            <Badge variant={statusVariant[run.data.status]} dot>
              {statusLabel[run.data.status]}
            </Badge>
          ) : undefined
        }
      />

      {isActive && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          El motor FTGM está procesando… esta vista se actualiza sola.
        </div>
      )}

      {run.data?.status === "failed" && run.data.error_message && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-semibold mb-0.5">La ejecución falló</p>
          {run.data.error_message}
        </div>
      )}

      <DataState
        loading={run.loading || results.loading}
        error={run.error || results.error}
        empty={items.length === 0}
        emptyMessage={
          isActive
            ? "Los resultados aparecerán aquí cuando el motor termine."
            : "Esta ejecución todavía no tiene resultados de pronóstico."
        }
        onRetry={() => reloadAll.current()}
      >
        {items.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {items.map((p) => {
              const info = productName(p.product_id);
              return (
                <button
                  key={p.product_id}
                  onClick={() => setSelected(p.product_id)}
                  title={info.name}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    p.product_id === activeId
                      ? "bg-primary text-white"
                      : "bg-surface-muted text-text-secondary hover:text-text-primary",
                  )}
                >
                  {info.sku}
                </button>
              );
            })}
          </div>
        )}

        {/* Product headline: which model actually ran, and why (provenance). */}
        {activeMetrics && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-text-primary mr-1">
              {productName(activeId ?? "").name || productName(activeId ?? "").sku}
            </span>
            {skipped ? (
              <Badge variant="danger" dot>Omitido</Badge>
            ) : usedFallback ? (
              <Badge variant="warning" dot>Baseline estacional (fallback)</Badge>
            ) : (
              <>
                <Badge variant="violet" dot>FTGM</Badge>
                <Badge variant="primary">Orden Fourier N = {activeMetrics.order_selected}</Badge>
              </>
            )}
            {activeMetrics.validation_rmse != null && (
              <span className="text-xs text-text-muted">
                RMSE validación: {Number(activeMetrics.validation_rmse).toFixed(2)}
              </span>
            )}
          </div>
        )}

        {(usedFallback || skipped) && activeMetrics?.fallback_reason && (
          <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs text-warning">
            <strong>{skipped ? "Producto omitido:" : "Por qué se usó el baseline:"}</strong>{" "}
            {activeMetrics.fallback_reason}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LineChartCard
              title="Demanda real vs. modelo"
              subtitle="Historia mensual (con quiebres imputados), ajuste in-sample y pronóstico con banda."
              data={chartData}
              labelPrefix=""
              valueFormatter={fmtUnits}
              lines={[
                { dataKey: "real", name: "Demanda real", stroke: "#0FB3A6" },
                { dataKey: "fitted", name: "Ajuste del modelo", stroke: "#8B5CF6", dashed: true, fill: false },
                { dataKey: "pred", name: "Pronóstico", stroke: "#5B6CD6" },
                { dataKey: "upper", name: "Límite superior", stroke: "#9AA1B9", dashed: true, fill: false },
                { dataKey: "lower", name: "Límite inferior", stroke: "#9AA1B9", dashed: true, fill: false },
              ]}
            />
          </div>

          <Card className="flex flex-col items-center justify-center text-center gap-4">
            {precision != null ? (
              <CircularGauge
                value={precision}
                size={150}
                label={`${precision.toFixed(1)}%`}
                caption="precisión (100 − MAPE)"
                color="#0FB3A6"
                trackColor="#D7F2EF"
              />
            ) : (
              <p className="text-sm text-text-muted py-10">Sin métricas para este producto.</p>
            )}
            <div className="grid grid-cols-3 gap-3 w-full">
              <Metric label="MAPE" value={mape != null ? `${mape.toFixed(1)}%` : "—"} />
              <Metric label="MAE" value={activeMetrics ? Number(activeMetrics.mae).toFixed(1) : "—"} />
              <Metric label="RMSE" value={activeMetrics ? Number(activeMetrics.rmse).toFixed(1) : "—"} />
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <Metric
                label="MASE"
                value={activeMetrics?.mase != null ? Number(activeMetrics.mase).toFixed(2) : "—"}
                hint="< 1 supera al naive"
              />
              <Metric
                label="RMSSE"
                value={activeMetrics?.rmsse != null ? Number(activeMetrics.rmsse).toFixed(2) : "—"}
                hint="métrica M5 del paper"
              />
            </div>
          </Card>
        </div>

        <Table
          title="Pronóstico por período"
          data={activeResult?.points ?? []}
          keyExtractor={(p) => p.period_date}
          columns={[
            { header: "Período", accessor: (p) => <span className="font-medium text-text-primary">{p.period_date.slice(0, 7)}</span> },
            { header: "Demanda pronosticada", accessor: (p) => <span className="font-semibold">{fmtUnits(Number(p.predicted_demand))}</span> },
            { header: "Límite inferior", accessor: (p) => <span className="text-text-secondary">{p.lower_bound != null ? fmtUnits(Number(p.lower_bound)) : "—"}</span> },
            { header: "Límite superior", accessor: (p) => <span className="text-text-secondary">{p.upper_bound != null ? fmtUnits(Number(p.upper_bound)) : "—"}</span> },
          ]}
        />
      </DataState>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-surface-soft py-2.5 px-1">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className="font-display text-sm font-semibold text-text-primary tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-text-muted mt-0.5">{hint}</p>}
    </div>
  );
}
