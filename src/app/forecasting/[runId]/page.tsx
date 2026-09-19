"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  Lightbulb,
  Minus,
  PackageSearch,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Select";
import { DataState } from "@/components/ui/DataState";
import { ActionPlan } from "@/components/ftgm/ActionPlan";
import { DiagnosticsPanel } from "@/components/ftgm/DiagnosticsPanel";
import { EngineProgress } from "@/components/ftgm/EngineProgress";
import { ForecastDrilldownChart } from "@/components/ftgm/ForecastDrilldownChart";
import { TrackingPanel } from "@/components/ftgm/TrackingPanel";
import {
  dateLabel,
  frequencyLabel,
  horizonLabel,
  modelLabel,
  num,
  pct,
  periodLabel,
  riskMeta,
  runStatusMeta,
  units,
} from "@/components/ftgm/labels";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { forecastingApi } from "@/lib/api";
import { ftgmApi } from "@/lib/apis/ftgm";
import type { OverviewProduct, RunTracking } from "@/types/ftgm";

export default function ForecastRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const companyId = useCompanyId();

  const run = useApi(() => (companyId ? ftgmApi.getRun(companyId, runId) : Promise.resolve(null)), [companyId, runId]);
  const active = run.data?.status === "pending" || run.data?.status === "running";
  const done = run.data?.status === "success";

  const reloadRun = useRef(run.reload);
  reloadRun.current = run.reload;
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => reloadRun.current(), 2000);
    return () => clearInterval(t);
  }, [active]);

  const overview = useApi(
    () => (companyId && done ? ftgmApi.overview(companyId, runId) : Promise.resolve(null)),
    [companyId, runId, done],
  );
  const results = useApi(
    () => (companyId && done ? forecastingApi.runResults(companyId, runId) : Promise.resolve([])),
    [companyId, runId, done],
  );

  const [tab, setTab] = useState("resumen");
  const [showTech, setShowTech] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tracking, setTracking] = useState<RunTracking | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "seguimiento" || !companyId || tracking) return;
    ftgmApi
      .tracking(companyId, runId)
      .then(setTracking)
      .catch((e) => setTrackingError(e instanceof Error ? e.message : "No se pudo cargar el seguimiento"));
  }, [tab, companyId, runId, tracking]);

  const ov = overview.data;
  const rows = ov?.products ?? [];
  const activeId = selected ?? rows[0]?.product_id ?? null;
  const activeRow = rows.find((r) => r.product_id === activeId);
  const activeResult = (results.data ?? []).find((r) => r.product_id === activeId);
  const diag = activeId ? ov?.diagnostics[activeId] : undefined;

  const status = run.data ? runStatusMeta[run.data.status] : null;
  const r = run.data;

  const productOptions = useMemo(
    () => rows.map((p) => ({ value: p.product_id, label: p.name, description: `${p.sku} · ${modelLabel[p.model_used] ?? p.model_used}` })),
    [rows],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <Link href="/forecasting" className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver al motor FTGM
      </Link>

      <PageHeader
        eyebrow="Motor FTGM · Resultado"
        eyebrowTone="violet"
        title={r?.scope_description ?? "Resultado del pronóstico"}
        description={
          r
            ? `Ejecutado el ${dateLabel(r.created_at ?? r.started_at)} · horizonte ${horizonLabel(r.horizon_days)} · frecuencia ${
                frequencyLabel[r.frequency ?? ""] ?? "mensual"
              } · ${r.product_count} producto(s)${r.as_of ? ` · historia hasta ${dateLabel(r.as_of)}` : ""}`
            : "Cargando ejecución…"
        }
        action={status ? <Badge variant={status.tone} dot>{status.label}</Badge> : undefined}
      />

      {r && (active || r.status === "failed" || r.status === "cancelled") && (
        <Card className="mx-auto max-w-2xl">
          <EngineProgress status={r.status} productCount={r.product_count} error={r.error_message} />
        </Card>
      )}

      {done && (
        <DataState loading={overview.loading && !ov} error={overview.error} onRetry={overview.reload}>
          {ov && (
            <>
              <ActionPlan rows={rows} />

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowTech((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showTech && "rotate-180")} />
                  {showTech ? "Ocultar detalle técnico" : "Ver detalle técnico (gráficos y métricas del modelo)"}
                </button>
              </div>

              {showTech && (
              <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi icon={TrendingUp} label="Demanda proyectada" value={units(ov.summary.total_forecast_units)} hint={`${units(ov.summary.next_period_units)} el próximo periodo`} />
                <Kpi icon={Boxes} label="Necesitan reabastecerse" value={`${ov.summary.products_need_restock}`} hint={`de ${ov.summary.products} producto(s)`} tone={ov.summary.products_need_restock ? "warning" : undefined} />
                <Kpi icon={AlertTriangle} label="Riesgo de quiebre" value={`${ov.summary.risk_high}`} hint={`alto · ${ov.summary.risk_medium} medio`} tone={ov.summary.risk_high ? "danger" : undefined} />
                <Kpi icon={Wallet} label="Inversión sugerida" value={soles(ov.summary.suggested_investment)} hint="cantidad sugerida × costo promedio" />
              </div>

              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: "resumen", label: "Resumen" },
                  { id: "productos", label: "Productos", count: rows.length },
                  { id: "diagnostico", label: "Diagnóstico" },
                  { id: "seguimiento", label: "Seguimiento" },
                ]}
              />

              {tab === "resumen" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <Card>
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-base font-semibold text-text-primary">{activeRow?.name ?? "Producto"}</h3>
                          <p className="text-xs text-text-muted">Historia observada, reparada y ajustada + pronóstico con intervalo del 90%.</p>
                        </div>
                        <div className="w-72 max-w-full">
                          <Select value={activeId ?? ""} onChange={setSelected} options={productOptions} size="sm" />
                        </div>
                      </div>
                      {activeResult && activeRow ? (
                        <ForecastDrilldownChart result={activeResult} frequency={activeRow.frequency} />
                      ) : (
                        <p className="py-16 text-center text-sm text-text-muted">Sin historia para este producto.</p>
                      )}
                    </Card>
                    {activeRow && <ProductCard p={activeRow} />}
                  </div>
                  <ProductsTable rows={rows} activeId={activeId} onSelect={setSelected} compact />
                  <Card className="flex flex-wrap items-center justify-between gap-4 border-accent-violet/25 bg-accent-violet-soft/15">
                    <div className="flex items-center gap-3">
                      <Lightbulb className="h-5 w-5 text-accent-violet" />
                      <div>
                        <p className="font-display font-semibold text-text-primary">Recomendaciones de reabastecimiento generadas</p>
                        <p className="text-sm text-text-secondary">El motor cruzó este pronóstico con tu stock y lead time.</p>
                      </div>
                    </div>
                    <Link href="/recommendations" className="btn btn-violet h-10 gap-2 px-4 text-sm">
                      Ver recomendaciones <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Card>
                </div>
              )}

              {tab === "productos" && (
                <ProductsTable
                  rows={rows}
                  activeId={activeId}
                  onSelect={(id) => {
                    setSelected(id);
                    setTab("resumen");
                  }}
                />
              )}

              {tab === "diagnostico" && (
                <Card className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold text-text-primary">Qué decidió el motor y por qué</h3>
                      <p className="text-xs text-text-muted">Explicado en simple, con la evidencia numérica al lado.</p>
                    </div>
                    <div className="w-72 max-w-full">
                      <Select value={activeId ?? ""} onChange={setSelected} options={productOptions} size="sm" />
                    </div>
                  </div>
                  {activeRow?.fallback_reason && (
                    <p className="rounded-2xl border border-warning/25 bg-warning-soft/50 px-4 py-3 text-sm text-warning">
                      <strong>{modelLabel[activeRow.model_used] ?? activeRow.model_used}:</strong> {activeRow.fallback_reason}
                    </p>
                  )}
                  <DiagnosticsPanel diag={diag} orderSelected={activeRow?.order_selected ?? 0} />
                  {ov.preview?.excluded && ov.preview.excluded.length > 0 && (
                    <div className="rounded-2xl border border-border-soft p-4 text-xs text-text-muted">
                      <p className="mb-1 font-semibold text-text-secondary">Productos excluidos del alcance</p>
                      {ov.preview.excluded.map((x) => (
                        <p key={x.product_id}>
                          {x.name}: {x.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {tab === "seguimiento" &&
                (trackingError ? (
                  <Card className="text-sm text-danger">{trackingError}</Card>
                ) : tracking ? (
                  <TrackingPanel tracking={tracking} />
                ) : (
                  <DataState loading error={null}>
                    {null}
                  </DataState>
                ))}
              </>
              )}
            </>
          )}
        </DataState>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint?: string;
  tone?: "warning" | "danger";
}) {
  return (
    <Card interactive className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-text-secondary">{label}</p>
        <span
          className={cn(
            "rounded-xl p-2.5",
            tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-accent-violet-soft text-accent-violet",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div>
        <p className="font-display text-[28px] font-semibold leading-none tracking-tight text-text-primary tabular-nums">{value}</p>
        {hint && <p className="mt-2 text-xs text-text-muted">{hint}</p>}
      </div>
    </Card>
  );
}

function Trend({ value }: { value: number | null }) {
  if (value == null) return <span className="text-text-muted">—</span>;
  const Icon = Math.abs(value) < 3 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-semibold tabular-nums", Math.abs(value) < 3 ? "text-text-secondary" : value > 0 ? "text-success" : "text-danger")}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

function accuracy(p: OverviewProduct) {
  const mape = p.holdout?.mape ?? (p.metrics ? Number(p.metrics.mape) : null);
  const mase = p.holdout?.mase ?? (p.metrics?.mase != null ? Number(p.metrics.mase) : null);
  return { mape, mase, holdout: !!p.holdout };
}

function ProductCard({ p }: { p: OverviewProduct }) {
  const acc = accuracy(p);
  const risk = riskMeta[p.stockout_risk];
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={p.status === "ok" ? "violet" : p.status === "fallback" ? "warning" : "danger"} dot>
          {modelLabel[p.model_used] ?? p.model_used}
        </Badge>
        {p.order_selected > 0 && <Badge variant="primary">Orden N = {p.order_selected}</Badge>}
        <Badge variant={risk.tone}>{risk.label}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Mini label={`Próximo (${periodLabel(p.next_period, p.frequency)})`} value={units(p.next_period_units, 1)} />
        <Mini label="Total horizonte" value={units(p.total_forecast_units)} />
        <Mini label="Stock actual" value={units(p.on_hand)} />
        <Mini label="Cobertura" value={p.coverage_days != null ? `${num(p.coverage_days)} días` : "—"} />
        <Mini label={acc.holdout ? "MAPE validación" : "MAPE ajuste"} value={pct(acc.mape)} />
        <Mini label="MASE" value={acc.mase != null ? acc.mase.toFixed(2) : "—"} />
      </div>
      {p.suggested_qty > 0 ? (
        <div className="rounded-2xl border border-accent-violet/25 bg-accent-violet-soft/25 p-4">
          <p className="text-xs text-text-secondary">Sugerencia de compra</p>
          <p className="font-display text-lg font-semibold text-text-primary">
            {num(p.suggested_qty)} u · {soles(p.suggested_investment)}
          </p>
          <p className="text-[11px] text-text-muted">Lead time {p.lead_time_days} días · stock de seguridad {p.safety_stock}</p>
        </div>
      ) : (
        <p className="rounded-2xl bg-success-soft/60 px-4 py-3 text-xs text-success">Stock suficiente para el horizonte cercano.</p>
      )}
      <Link href={`/inventory/${p.product_id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-violet hover:opacity-80">
        <PackageSearch className="h-4 w-4" /> Ver ficha del producto
      </Link>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-soft px-3 py-2">
      <p className="truncate text-[10.5px] text-text-muted">{label}</p>
      <p className="font-display text-sm font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}

function ProductsTable({
  rows,
  activeId,
  onSelect,
  compact,
}: {
  rows: OverviewProduct[];
  activeId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const shown = compact ? rows.slice(0, 8) : rows;
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="font-display text-[15px] font-semibold text-text-primary">Pronóstico por producto</h3>
        {compact && rows.length > shown.length && <span className="text-xs text-text-muted">Mostrando {shown.length} de {rows.length}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-soft/60 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              <th className="px-6 py-3">Producto</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">MAPE</th>
              <th className="px-4 py-3">MASE</th>
              <th className="px-4 py-3">Tendencia</th>
              <th className="px-4 py-3">Próximo periodo</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Riesgo</th>
              <th className="px-4 py-3">Comprar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {shown.map((p) => {
              const acc = accuracy(p);
              const risk = riskMeta[p.stockout_risk];
              return (
                <tr
                  key={p.product_id}
                  onClick={() => onSelect(p.product_id)}
                  className={cn("cursor-pointer transition-colors hover:bg-accent-violet-soft/15", activeId === p.product_id && "bg-accent-violet-soft/25")}
                >
                  <td className="px-6 py-3">
                    <Link href={`/inventory/${p.product_id}`} onClick={(e) => e.stopPropagation()} className="block max-w-[260px] truncate font-medium text-text-primary hover:text-accent-violet">
                      {p.name}
                    </Link>
                    <span className="font-mono text-[11px] text-text-muted">{p.sku}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-text-primary">{modelLabel[p.model_used] ?? p.model_used}</span>
                    {p.order_selected > 0 && <span className="ml-1 text-xs text-text-muted">N={p.order_selected}</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{pct(acc.mape)}</td>
                  <td className="px-4 py-3 tabular-nums">{acc.mase != null ? acc.mase.toFixed(2) : "—"}</td>
                  <td className="px-4 py-3">
                    <Trend value={p.trend_pct} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {units(p.next_period_units, 1)}
                    <span className="block text-[11px] text-text-muted">{periodLabel(p.next_period, p.frequency)}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{num(p.on_hand)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={risk.tone}>{risk.label.replace("Riesgo ", "")}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p.suggested_qty > 0 ? `${num(p.suggested_qty)} u` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
