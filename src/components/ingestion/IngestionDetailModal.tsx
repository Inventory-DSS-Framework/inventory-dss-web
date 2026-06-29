"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ingestionApi, dataPreparationApi } from "@/lib/api";
import type { IngestionBatchDTO, PreparedDatasetDTO } from "@/types/api";
import { cn } from "@/lib/utils";

// ─── Step helpers ──────────────────────────────────────────────────────────────

const STEPS = ["Mapear columnas", "Validar archivo", "Preparar dataset"] as const;

function stepIndex(status: string): number {
  if (status === "uploaded") return 0;
  if (status === "mapping" || status === "validating") return 1;
  if (status === "validated") return 2;
  return 0;
}

// ─── Column mapping config ─────────────────────────────────────────────────────

const FIELDS = [
  { key: "date",     label: "Fecha",             hint: "Columna con la fecha (formato YYYY-MM-DD)", required: true },
  { key: "sku",      label: "SKU del producto",   hint: "Columna con el código de producto",         required: true },
  { key: "quantity", label: "Cantidad vendida",   hint: "Columna con la cantidad (número entero)",   required: true },
  { key: "stockout", label: "Quiebre de stock",   hint: "Columna 0/1 indicando quiebre (opcional)", required: false },
] as const;

const DEFAULT_MAPPING: Record<string, string> = {
  date: "date",
  sku: "sku",
  quantity: "quantity",
  stockout: "stockout",
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  batch: IngestionBatchDTO | null;
  companyId: string;
  onClose: () => void;
  onUpdated: (b: IngestionBatchDTO) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function IngestionDetailModal({ batch, companyId, onClose, onUpdated }: Props) {
  const router = useRouter();

  const [mapping, setMapping] = useState<Record<string, string>>(DEFAULT_MAPPING);
  const [treatZero, setTreatZero] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreparedDatasetDTO | null>(null);

  // Sync mapping from batch when it changes
  useEffect(() => {
    if (!batch) return;
    const m = batch.column_mapping;
    if (m && Object.keys(m).length > 0) {
      setMapping({ ...DEFAULT_MAPPING, ...m });
    } else {
      setMapping(DEFAULT_MAPPING);
    }
    setError(null);
    setResult(null);
  }, [batch?.id]);

  if (!batch) return null;

  const step = stepIndex(batch.status);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleSaveMapping = async () => {
    setWorking(true);
    setError(null);
    try {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(mapping)) {
        if (v.trim()) clean[k] = v.trim();
      }
      const updated = await ingestionApi.setMapping(companyId, batch.id, clean);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el mapeo.");
    } finally {
      setWorking(false);
    }
  };

  const handleValidate = async () => {
    setWorking(true);
    setError(null);
    try {
      const updated = await ingestionApi.validate(companyId, batch.id);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al validar el archivo.");
    } finally {
      setWorking(false);
    }
  };

  const handlePrepare = async () => {
    setWorking(true);
    setError(null);
    try {
      const dataset = await dataPreparationApi.prepare(companyId, batch.id, treatZero);
      setResult(dataset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al preparar el dataset.");
    } finally {
      setWorking(false);
    }
  };

  // ── Footer ───────────────────────────────────────────────────────────────────

  const footer = result ? (
    <>
      <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      <Button onClick={() => { onClose(); router.push("/data-preparation"); }}>
        Ver dataset <ArrowRight className="w-4 h-4" />
      </Button>
    </>
  ) : batch.status === "failed" ? (
    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
  ) : step === 0 ? (
    <>
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button onClick={handleSaveMapping} disabled={working}>
        {working ? "Guardando…" : "Guardar mapeo"}
      </Button>
    </>
  ) : step === 1 ? (
    <>
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button onClick={handleValidate} disabled={working}>
        {working ? "Validando…" : "Validar archivo"}
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button onClick={handlePrepare} disabled={working}>
        {working ? "Preparando…" : "Preparar dataset"}
      </Button>
    </>
  );

  return (
    <Modal
      open={!!batch}
      onClose={onClose}
      title={batch.file_name}
      description={`${batch.row_count} filas · ${batch.error_count} errores`}
      size="md"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Step indicator */}
        {!result && batch.status !== "failed" && (
          <StepIndicator current={step} />
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success state */}
        {result && <SuccessView dataset={result} />}

        {/* Failed state */}
        {!result && batch.status === "failed" && <FailedView />}

        {/* Step 0 — mapping form */}
        {!result && batch.status !== "failed" && step === 0 && (
          <MappingForm mapping={mapping} onChange={(k, v) => setMapping(prev => ({ ...prev, [k]: v }))} />
        )}

        {/* Step 1 — mapping summary + validate */}
        {!result && batch.status !== "failed" && step === 1 && (
          <MappingSummary mapping={batch.column_mapping} />
        )}

        {/* Step 2 — prepare options */}
        {!result && batch.status !== "failed" && step === 2 && (
          <PrepareOptions treatZero={treatZero} onChangeTreatZero={setTreatZero} />
        )}
      </div>
    </Modal>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                  done  && "bg-primary border-primary text-white",
                  active && "bg-surface border-primary text-primary",
                  !done && !active && "bg-surface border-border text-text-muted",
                )}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium whitespace-nowrap",
                  active ? "text-primary" : done ? "text-text-secondary" : "text-text-muted",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-px mx-2 mb-4", done ? "bg-primary/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MappingForm({
  mapping,
  onChange,
}: {
  mapping: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Indica qué columna del CSV corresponde a cada campo del sistema. Los nombres por defecto ya
        coinciden con <code className="font-mono text-xs bg-surface-soft px-1 rounded">ventas.csv</code>.
      </p>
      <div className="space-y-3">
        {FIELDS.map(({ key, label, hint, required }) => (
          <div key={key} className="grid grid-cols-[140px_1fr] gap-3 items-start">
            <div className="pt-2">
              <span className="text-sm font-medium text-text-primary">{label}</span>
              {required && <span className="text-danger ml-1 text-xs">*</span>}
            </div>
            <div className="space-y-1">
              <input
                type="text"
                value={mapping[key] ?? ""}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={key}
                className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
              <p className="text-xs text-text-muted">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MappingSummary({ mapping }: { mapping: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        El mapeo de columnas fue guardado. Haz clic en <strong>Validar archivo</strong> para verificar
        que el CSV tiene el formato correcto y está listo para el pipeline.
      </p>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-soft">
              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Campo del sistema</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Columna en el CSV</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(({ key, label }) => (
              <tr key={key} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-text-secondary">{label}</td>
                <td className="px-4 py-2.5 font-mono text-primary text-xs">
                  {mapping[key] ?? <span className="text-text-muted italic">— no mapeado —</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrepareOptions({
  treatZero,
  onChangeTreatZero,
}: {
  treatZero: boolean;
  onChangeTreatZero: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        El archivo está validado. El pipeline leerá el CSV, resolverá los SKUs contra el catálogo de
        productos y generará las series de demanda mensuales.
      </p>
      <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-soft px-4 py-3 cursor-pointer hover:border-primary/40 transition-colors">
        <input
          type="checkbox"
          checked={treatZero}
          onChange={(e) => onChangeTreatZero(e.target.checked)}
          className="mt-0.5 accent-primary shrink-0"
        />
        <div>
          <p className="text-sm font-medium text-text-primary">Tratar ceros como quiebre de stock</p>
          <p className="text-xs text-text-muted mt-0.5">
            Activa esto solo si tu CSV <em>no</em> tiene columna de stockout y los días con venta 0
            deben interpretarse como demanda censurada.
            <br />
            <strong>Deja desactivado</strong> si usas <code className="font-mono">ventas.csv</code> (ya tiene la columna <code className="font-mono">stockout</code>).
          </p>
        </div>
      </label>
      <p className="text-xs text-text-muted">
        Los SKUs sin coincidencia en el catálogo de productos se omiten. Asegúrate de haber creado
        los productos (SKU-001 a SKU-012) antes de preparar.
      </p>
    </div>
  );
}

function SuccessView({ dataset }: { dataset: PreparedDatasetDTO }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <div className="w-14 h-14 rounded-full bg-success-soft flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-success" />
      </div>
      <div>
        <p className="font-semibold text-text-primary text-lg">Dataset preparado</p>
        <p className="text-sm text-text-secondary mt-1">
          Se generaron <strong>{dataset.product_count}</strong> series de demanda.
          {dataset.period_start && dataset.period_end && (
            <> Periodo: <strong>{dataset.period_start}</strong> → <strong>{dataset.period_end}</strong>.</>
          )}
        </p>
      </div>
      <p className="text-xs text-text-muted">
        Ahora puedes ir a <strong>Predicción</strong> para ejecutar el motor FTGM sobre este dataset.
      </p>
    </div>
  );
}

function FailedView() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-danger" />
      </div>
      <div>
        <p className="font-semibold text-text-primary">Carga fallida</p>
        <p className="text-sm text-text-secondary mt-1">
          Este archivo no pudo procesarse. Sube una nueva versión corregida.
        </p>
      </div>
    </div>
  );
}
