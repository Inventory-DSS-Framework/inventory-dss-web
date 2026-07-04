"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { Modal } from "@/components/ui/Modal";
import { Activity, Database, CalendarRange } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { dataPreparationApi, forecastingApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PreparedDatasetDTO, RunStatus } from "@/types/api";

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

const HORIZONS = [
  { days: 30, label: "1 mes" },
  { days: 90, label: "3 meses" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "12 meses" },
] as const;

export default function ForecastingPage() {
  const companyId = useCompanyId();
  const [modalOpen, setModalOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runs = useApi(
    () => (companyId ? forecastingApi.listRuns(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = runs.data ?? [];

  // While any run is pending/running, poll so the table reflects live status.
  const hasActive = items.some((r) => r.status === "pending" || r.status === "running");
  const reloadRef = useRef(runs.reload);
  reloadRef.current = runs.reload;
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => reloadRef.current(), 2500);
    return () => clearInterval(t);
  }, [hasActive]);

  const handleLaunch = async (datasetId: string, horizonDays: number) => {
    if (!companyId) return;
    setWorking(true);
    setActionError(null);
    try {
      const run = await forecastingApi.createRun(companyId, {
        model_name: "FTGM",
        horizon_days: horizonDays,
        dataset_id: datasetId,
      });
      await forecastingApi.executeRun(companyId, run.id);
      setModalOpen(false);
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
          <Button variant="violet" onClick={() => setModalOpen(true)} disabled={!companyId}>
            <Activity className="w-4 h-4" />
            Nueva ejecución
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
        emptyMessage="Aún no hay ejecuciones. Crea una con «Nueva ejecución» — necesitas un dataset preparado."
        onRetry={runs.reload}
      >
        <Table
          title="Historial de ejecuciones"
          data={items}
          keyExtractor={(r) => r.id}
          columns={[
            { header: "Ejecución", accessor: (r) => <span className="font-mono text-text-secondary">{r.id.slice(0, 8)}</span> },
            { header: "Modelo", accessor: (r) => <span className="font-medium text-text-primary">{r.model_name}</span> },
            {
              header: "Dataset",
              accessor: (r) =>
                r.dataset_id ? (
                  <span className="font-mono text-xs text-text-secondary">{r.dataset_id.slice(0, 8)}</span>
                ) : (
                  <span className="text-text-muted">—</span>
                ),
            },
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

      {companyId && (
        <NewRunModal
          open={modalOpen}
          companyId={companyId}
          working={working}
          onClose={() => setModalOpen(false)}
          onLaunch={handleLaunch}
        />
      )}
    </div>
  );
}

// ─── New run modal ─────────────────────────────────────────────────────────────

function NewRunModal({
  open,
  companyId,
  working,
  onClose,
  onLaunch,
}: {
  open: boolean;
  companyId: string;
  working: boolean;
  onClose: () => void;
  onLaunch: (datasetId: string, horizonDays: number) => void;
}) {
  const datasets = useApi(
    () => (open ? dataPreparationApi.listDatasets(companyId) : Promise.resolve([])),
    [companyId, open],
  );
  const ready = useMemo(
    () => (datasets.data ?? []).filter((d) => d.status === "ready"),
    [datasets.data],
  );

  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<number>(90);
  // Default to the most recent ready dataset once loaded.
  useEffect(() => {
    if (ready.length > 0 && !datasetId) setDatasetId(ready[0].id);
  }, [ready, datasetId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva ejecución FTGM"
      description="Elige el dataset preparado y el horizonte del pronóstico."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="violet"
            disabled={working || !datasetId}
            onClick={() => datasetId && onLaunch(datasetId, horizon)}
          >
            {working ? "Lanzando…" : "Ejecutar pronóstico"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            <Database className="w-3.5 h-3.5" /> Dataset preparado
          </p>
          {datasets.loading ? (
            <p className="text-sm text-text-muted py-3">Cargando datasets…</p>
          ) : ready.length === 0 ? (
            <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
              No hay datasets listos. Ve a <strong>Ingesta</strong>, sube tus ventas y ejecuta
              «Preparar dataset» primero.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {ready.map((d) => (
                <DatasetOption
                  key={d.id}
                  dataset={d}
                  selected={d.id === datasetId}
                  onSelect={() => setDatasetId(d.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
            <CalendarRange className="w-3.5 h-3.5" /> Horizonte
          </p>
          <div className="grid grid-cols-4 gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h.days}
                type="button"
                onClick={() => setHorizon(h.days)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                  horizon === h.days
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface-soft text-text-secondary hover:border-primary/40",
                )}
              >
                {h.label}
                <span className="block text-[10px] font-normal text-text-muted">{h.days} días</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2">
            El motor agrupa por mes: {Math.max(1, Math.ceil(horizon / 30))} periodo(s) pronosticado(s).
          </p>
        </div>
      </div>
    </Modal>
  );
}

function DatasetOption({
  dataset,
  selected,
  onSelect,
}: {
  dataset: PreparedDatasetDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border px-4 py-3 transition-colors",
        selected
          ? "border-primary bg-primary-soft/60"
          : "border-border bg-surface-soft hover:border-primary/40",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-semibold text-text-primary">
          {dataset.id.slice(0, 8)}
        </span>
        <span className={cn("w-2.5 h-2.5 rounded-full", selected ? "bg-primary" : "bg-border")} />
      </div>
      <p className="text-xs text-text-secondary mt-1">
        {dataset.product_count} producto(s)
        {dataset.period_start && dataset.period_end && (
          <> · {dataset.period_start.slice(0, 7)} → {dataset.period_end.slice(0, 7)}</>
        )}
      </p>
    </button>
  );
}
