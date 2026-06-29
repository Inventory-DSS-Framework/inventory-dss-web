"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Badge } from "@/components/ui/Table";
import { CircularGauge } from "@/components/ui/CircularGauge";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { DataState } from "@/components/ui/DataState";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { forecastingApi } from "@/lib/api";
import type { RunStatus } from "@/types/api";

const soles = (v: number) => `S/ ${v.toFixed(0)}`;

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

  const products = results.data ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? products[0]?.product_id ?? null;
  const activeResult = products.find((p) => p.product_id === activeId);
  const activeMetrics = (metrics.data ?? []).find((m) => m.product_id === activeId);

  const chartData = useMemo(
    () =>
      (activeResult?.points ?? []).map((p) => ({
        name: p.period_date.slice(0, 7),
        pred: Number(p.predicted_demand),
        lower: p.lower_bound != null ? Number(p.lower_bound) : 0,
        upper: p.upper_bound != null ? Number(p.upper_bound) : 0,
      })),
    [activeResult],
  );

  const mape = activeMetrics ? Number(activeMetrics.mape) : null;
  const precision = mape != null ? Math.max(0, Math.min(100, 100 - mape)) : null;

  const runInfo = run.data
    ? `${run.data.model_name} · ${run.data.horizon_days} días · ${statusLabel[run.data.status]}`
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

      {run.data?.status === "failed" && run.data.error_message && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {run.data.error_message}
        </div>
      )}

      <DataState
        loading={run.loading || results.loading}
        error={run.error || results.error}
        empty={products.length === 0}
        emptyMessage="Esta ejecución todavía no tiene resultados de pronóstico."
        onRetry={() => {
          run.reload();
          results.reload();
          metrics.reload();
        }}
      >
        {products.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p.product_id}
                onClick={() => setSelected(p.product_id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium font-mono transition-colors",
                  p.product_id === activeId
                    ? "bg-primary text-white"
                    : "bg-surface-muted text-text-secondary hover:text-text-primary",
                )}
              >
                {p.product_id.slice(0, 8)}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LineChartCard
              title="Demanda pronosticada (FTGM)"
              data={chartData}
              labelPrefix=""
              valueFormatter={soles}
              lines={[
                { dataKey: "pred", name: "Pronóstico", stroke: "#0FB3A6" },
                { dataKey: "upper", name: "Límite superior", stroke: "#9AA1B9", dashed: true, fill: false },
                { dataKey: "lower", name: "Límite inferior", stroke: "#9AA1B9", dashed: true, fill: false },
              ]}
            />
          </div>

          <Card className="flex flex-col items-center justify-center text-center gap-4">
            {precision != null ? (
              <CircularGauge value={precision} size={150} label={`${precision.toFixed(1)}%`} caption="precisión" color="#0FB3A6" trackColor="#D7F2EF" />
            ) : (
              <p className="text-sm text-text-muted py-10">Sin métricas para este producto.</p>
            )}
            <div className="grid grid-cols-3 gap-3 w-full">
              <Metric label="MAPE" value={mape != null ? `${mape.toFixed(1)}%` : "—"} />
              <Metric label="MAE" value={activeMetrics ? Number(activeMetrics.mae).toFixed(1) : "—"} />
              <Metric label="RMSE" value={activeMetrics ? Number(activeMetrics.rmse).toFixed(1) : "—"} />
            </div>
          </Card>
        </div>

        <Table
          title="Detalle por período"
          data={activeResult?.points ?? []}
          keyExtractor={(p) => p.period_date}
          columns={[
            { header: "Período", accessor: (p) => <span className="font-medium text-text-primary">{p.period_date.slice(0, 7)}</span> },
            { header: "Pronóstico", accessor: (p) => <span className="font-semibold">{soles(Number(p.predicted_demand))}</span> },
            { header: "Límite inferior", accessor: (p) => <span className="text-text-secondary">{p.lower_bound != null ? soles(Number(p.lower_bound)) : "—"}</span> },
            { header: "Límite superior", accessor: (p) => <span className="text-text-secondary">{p.upper_bound != null ? soles(Number(p.upper_bound)) : "—"}</span> },
          ]}
        />
      </DataState>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-soft py-2.5">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className="font-display text-sm font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}
