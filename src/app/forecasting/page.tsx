"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { Activity } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { forecastingApi } from "@/lib/api";
import type { RunStatus } from "@/types/api";

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

export default function ForecastingPage() {
  const companyId = useCompanyId();
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runs = useApi(
    () => (companyId ? forecastingApi.listRuns(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = runs.data ?? [];

  const handleRun = async () => {
    if (!companyId) return;
    setWorking(true);
    setActionError(null);
    try {
      const run = await forecastingApi.createRun(companyId, {
        model_name: "FTGM",
        horizon_days: 30,
      });
      await forecastingApi.executeRun(companyId, run.id);
      runs.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo ejecutar");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Inteligencia"
        title="Predicción de demanda"
        description="Ejecuciones del motor FTGM y su estado."
        action={
          <Button variant="violet" onClick={handleRun} disabled={working || !companyId}>
            <Activity className="w-4 h-4" />
            {working ? "Ejecutando…" : "Ejecutar forecast"}
          </Button>
        }
      />

      {actionError && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      <DataState
        loading={runs.loading}
        error={runs.error}
        empty={items.length === 0}
        emptyMessage="Aún no hay ejecuciones de pronóstico."
        onRetry={runs.reload}
      >
        <Table
          title="Historial de ejecuciones"
          data={items}
          keyExtractor={(r) => r.id}
          columns={[
            { header: "Ejecución", accessor: (r) => <span className="font-mono text-text-secondary">{r.id.slice(0, 8)}</span> },
            { header: "Modelo", accessor: (r) => <span className="font-medium text-text-primary">{r.model_name}</span> },
            { header: "Horizonte", accessor: (r) => `${r.horizon_days} días` },
            { header: "Creado", accessor: (r) => (r.started_at ? r.started_at.slice(0, 16).replace("T", " ") : "—") },
            {
              header: "Estado",
              accessor: (r) => (
                <Badge variant={statusVariant[r.status]} dot>
                  {statusLabel[r.status]}
                </Badge>
              ),
            },
            {
              header: "",
              accessor: (r) => (
                <Link href={`/forecasting/${r.id}`} className="text-primary hover:text-primary-hover text-sm font-semibold whitespace-nowrap">
                  Ver detalle
                </Link>
              ),
            },
          ]}
        />
      </DataState>
    </div>
  );
}
