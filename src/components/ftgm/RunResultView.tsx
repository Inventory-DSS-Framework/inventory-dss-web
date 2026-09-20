"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  Gauge,
  LineChart,
  Minus,
  PackageSearch,
  Percent,
  PieChart,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Select";
import { DataState } from "@/components/ui/DataState";
import { DecisionHero } from "@/components/ftgm/DecisionHero";
import { DiagnosticsPanel } from "@/components/ftgm/DiagnosticsPanel";
import { EngineProgress } from "@/components/ftgm/EngineProgress";
import { ForecastDrilldownChart } from "@/components/ftgm/ForecastDrilldownChart";
import { CoverageTimeline, ForecastBars, SeasonalityBars, StockCoverCard } from "@/components/ftgm/ResultCharts";
import { TrackingPanel } from "@/components/ftgm/TrackingPanel";
import {
  dateLabel,
  forWhen,
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
import { useExpertMode } from "@/hooks/useExpertMode";
import { ACTIONS, confidenceOf, decide } from "@/components/ftgm/decisions";
import { forecastingApi } from "@/lib/api";
import { ftgmApi } from "@/lib/apis/ftgm";
import type { OverviewProduct, ProductDiagnostics, RunTracking } from "@/types/ftgm";

/**
 * The result of one prediction: how much you will sell, what to buy and (for experts)
 * the model's own diagnostics. Rendered inside the /forecasting stepper, so it carries
 * no page chrome of its own.
 */
export function RunResultView({ companyId, runId }: { companyId: string | null; runId: string }) {
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
  const [expert] = useExpertMode();
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

  // Elegir en la comparativa cambia todas las tarjetas de arriba: hay que volver a verlas.
  const pick = (id: string) => {
    setSelected(id);
    document.getElementById("resultado-producto")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const status = run.data ? runStatusMeta[run.data.status] : null;
  const r = run.data;

  const productOptions = useMemo(
    () => rows.map((p) => ({ value: p.product_id, label: p.name, description: `${p.sku} · ${modelLabel[p.model_used] ?? p.model_used}` })),
    [rows],
  );

  return (
    <div className="space-y-6">
      {r && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-display text-base font-semibold text-text-primary">{r.scope_description ?? "Resultado del cálculo"}</h3>
              {status && (
                <Badge variant={status.tone} dot>
                  {status.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-muted">
              {expert
                ? `Ejecutado el ${dateLabel(r.created_at ?? r.started_at)} · horizonte ${horizonLabel(r.horizon_days)} · frecuencia ${
                    frequencyLabel[r.frequency ?? ""] ?? "mensual"
                  } · ${r.product_count} producto(s)${r.as_of ? ` · historia hasta ${dateLabel(r.as_of)}` : ""}`
                : `Calculado el ${dateLabel(r.created_at ?? r.started_at)} · ${forWhen(r.horizon_days)} · ${r.product_count} ${
                    r.product_count === 1 ? "producto" : "productos"
                  }`}
            </p>
          </div>
          {/* One selector for the whole result: every card below follows this product. */}
          {done && rows.length > 1 && (
            <div className="w-64 max-w-full">
              <Select value={activeId ?? ""} onChange={setSelected} options={productOptions} size="sm" aria-label="Producto" />
            </div>
          )}
        </div>
      )}

      {r && (active || r.status === "failed" || r.status === "cancelled") && (
        <Card className="mx-auto max-w-2xl">
          <EngineProgress status={r.status} productCount={r.product_count} error={r.error_message} />
        </Card>
      )}

      {done && (
        <DataState loading={overview.loading && !ov} error={overview.error} onRetry={overview.reload}>
          {ov && (
            <div className="space-y-6">
              <MockNotice diagnostics={ov.diagnostics} />

              {/* "Confianza X en este cálculo": oculto a pedido del negocio. */}

              {/* La decisión, una sola vez: qué hacer, por qué, los números y el botón. */}
              {activeRow && (
                <div id="resultado-producto" className="scroll-mt-24">
                  <DecisionHero p={activeRow} diag={diag} result={activeResult} />
                </div>
              )}

              {/* 60 / 40: la proyección a la izquierda, "¿me alcanza el stock?" a la derecha. */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
                <ChartCard
                  icon={LineChart}
                  delay={0.05}
                  title="Así irían tus ventas"
                  hint="La línea sólida es lo que vendiste; la franja es el rango probable de lo que viene."
                >
                  {activeResult && activeRow ? (
                    <ForecastDrilldownChart result={activeResult} frequency={activeRow.frequency} simple={!expert} height={300} />
                  ) : (
                    <NoData />
                  )}
                </ChartCard>
                <ChartCard icon={PieChart} delay={0.12} title="¿Te alcanza el stock?" hint="Cuánto de lo que venderás ya está en tu almacén.">
                  {activeRow ? <StockCoverCard p={activeRow} /> : <NoData />}
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ChartCard
                  icon={BarChart3}
                  delay={0.19}
                  title="Cuánto venderás cada periodo"
                  hint="La barra es lo esperado; la marca vertical, el rango probable."
                >
                  {activeResult && activeRow ? <ForecastBars result={activeResult} frequency={activeRow.frequency} /> : <NoData />}
                </ChartCard>
                <ChartCard
                  icon={CalendarRange}
                  delay={0.26}
                  title="En qué meses vendes más"
                  hint="Promedio de cada mes en tu historia: la barra resaltada es tu temporada alta."
                >
                  {activeResult ? <SeasonalityBars result={activeResult} /> : <NoData />}
                </ChartCard>
              </div>

              <ChartCard
                icon={Gauge}
                delay={0.33}
                title="Hasta cuándo te alcanza"
                hint="Los días que dura tu stock frente a lo que demora tu proveedor y hasta dónde mira la predicción."
              >
                {activeRow && r ? <CoverageTimeline p={activeRow} horizonDays={r.horizon_days} /> : <NoData />}
              </ChartCard>

              {rows.length > 1 && <ProductCompare rows={rows} activeId={activeId} onSelect={pick} />}

              {expert && (
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
              )}

              {expert && showTech && (
                <div className="space-y-6">
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
                </div>
              )}
            </div>
          )}
        </DataState>
      )}
    </div>
  );
}

/**
 * The demo engine labels every result it produces; the real engine never sets `engine`,
 * so this banner only ever shows in mock mode.
 */
function MockNotice({ diagnostics }: { diagnostics: Record<string, ProductDiagnostics> }) {
  const mock = Object.values(diagnostics ?? {}).find((d) => d?.engine === "mock");
  if (!mock) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-accent-violet/30 bg-accent-violet-soft/40 px-4 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-violet text-white">
        <BadgeCheck className="h-4 w-4" />
      </span>
      <p className="text-sm font-semibold text-text-primary">
        {mock.mock_notice ?? "Cálculo listo — SUFICIENTE ventas para REALIZAR PREDICCIÓN."}
      </p>
    </div>
  );
}

/**
 * Every visual of the result sits in the same frame, so the grid reads as one block: the
 * same header, a corner glow for depth, and a staggered entrance that lets the cards land
 * one after another instead of all at once.
 */
function ChartCard({
  icon: Icon,
  title,
  hint,
  delay = 0,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  hint: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Card
      interactive
      className="relative flex flex-col overflow-hidden"
      style={{ animation: "fade-up 0.6s var(--ease-out) both", animationDelay: `${delay}s` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full"
        style={{ background: "radial-gradient(circle, rgb(var(--c-accent) / 0.10), transparent 70%)" }}
      />
      <div className="relative mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-surface-soft to-surface-muted text-text-secondary shadow-soft ring-1 ring-border-soft">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold text-text-primary">{title}</h3>
          <p className="text-xs leading-relaxed text-text-muted">{hint}</p>
        </div>
      </div>
      <div className="relative flex-1">{children}</div>
    </Card>
  );
}

function NoData() {
  return <p className="py-14 text-center text-sm text-text-muted">Sin datos para este producto.</p>;
}

/**
 * With several products the old card list repeated the decision once per product. This says
 * the same in one glance: who moves the most, what to do with each and what it costs —
 * and clicking a row points every chart above at that product.
 */
function ProductCompare({
  rows,
  activeId,
  onSelect,
}: {
  rows: OverviewProduct[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.next_period_units - a.next_period_units);
  const top = Math.max(...sorted.map((p) => p.next_period_units), 1);

  return (
    <Card className="p-0">
      <div className="flex items-start gap-3 px-6 pb-4 pt-6">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-soft text-text-secondary">
          <BarChart3 className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h3 className="font-display text-[15px] font-semibold text-text-primary">Comparativa de tus productos</h3>
          <p className="text-xs text-text-muted">Cuánto moverá cada uno el próximo periodo. Elige uno para ver su detalle arriba.</p>
        </div>
      </div>
      <div className="divide-y divide-border-soft border-t border-border">
        {sorted.map((p) => {
          const d = decide(p);
          const a = ACTIONS[d.action];
          const chip =
            a.tone === "danger"
              ? "bg-danger-soft text-danger"
              : a.tone === "warning"
                ? "bg-warning-soft text-warning"
                : a.tone === "success"
                  ? "bg-success-soft text-success"
                  : a.tone === "violet"
                    ? "bg-accent-violet-soft text-accent-violet"
                    : "bg-surface-muted text-text-secondary";
          return (
            <button
              key={p.product_id}
              type="button"
              onClick={() => onSelect(p.product_id)}
              className={cn(
                "flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-surface-soft",
                activeId === p.product_id && "bg-primary-soft/25",
              )}
            >
              <span className="w-[34%] min-w-0">
                <span className="block truncate text-sm font-medium text-text-primary">{p.name}</span>
                <span className="block font-mono text-[11px] text-text-muted">{p.sku}</span>
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-2.5 rounded-full bg-primary"
                    style={{ width: `${Math.max(4, (p.next_period_units / top) * 100)}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right font-display text-sm font-semibold text-text-primary tabular-nums">
                  {units(p.next_period_units, 1)}
                </span>
              </span>
              <span className={cn("hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex", chip)}>
                <a.icon className="h-3.5 w-3.5" /> {a.short}
              </span>
              <span className="w-20 shrink-0 text-right text-xs text-text-secondary tabular-nums">
                {p.suggested_qty > 0 ? `${Math.ceil(p.suggested_qty)} u` : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
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

/**
 * One plain sentence on how much to trust the numbers: the engine re-ran itself on the
 * shop's own past months and measured how many units it got right.
 */
function Reliability({ accuracy, products }: { accuracy: number | null; products: number }) {
  if (accuracy == null) {
    return (
      <Card className="flex flex-wrap items-center gap-4 border-primary/25 bg-primary-soft/30">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface font-display text-lg font-semibold">
          ✓
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-text-primary">Cálculo listo — aún con pocas ventas para probarlo</p>
          <p className="text-sm text-text-secondary">
            Tus productos todavía registran pocas ventas, así que no pudimos medir cuánto acierta el cálculo con tu
            historial. Úsalo como referencia: mientras más semanas de ventas registres, más preciso se vuelve.
          </p>
        </div>
      </Card>
    );
  }
  const level = confidenceOf(accuracy);
  const tone =
    level === "Alta"
      ? "border-success/30 bg-success-soft/40 text-success"
      : level === "Media"
        ? "border-primary/25 bg-primary-soft/40 text-primary"
        : "border-warning/30 bg-warning-soft/40 text-warning";
  return (
    <Card className={cn("flex flex-wrap items-center gap-4", tone)}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface font-display text-lg font-semibold tabular-nums">
        {Math.round(accuracy)}%
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-text-primary">Confianza {level.toLowerCase()} en este cálculo</p>
        <p className="text-sm text-text-secondary">
          Lo probamos con tus propias ventas pasadas: de cada 100 unidades que vendiste, el cálculo acertó unas{" "}
          {Math.round(accuracy)}
          {products > 1 ? " (promedio de tus productos, pesando más los que más vendes)." : "."}
          {level === "Baja" && " Úsalo como referencia y revisa antes de comprar mucho."}
        </p>
      </div>
    </Card>
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
        <Mini icon={CalendarClock} label={`Próximo (${periodLabel(p.next_period, p.frequency)})`} value={units(p.next_period_units, 1)} />
        <Mini icon={TrendingUp} label="Total horizonte" value={units(p.total_forecast_units)} />
        <Mini icon={Boxes} label="Stock actual" value={units(p.on_hand)} />
        <Mini icon={Timer} label="Cobertura" value={p.coverage_days != null ? `${num(p.coverage_days)} días` : "—"} />
        <Mini icon={BadgeCheck} label="Precisión (pasado)" value={p.accuracy_pct != null ? `${Math.round(p.accuracy_pct)}%` : "—"} />
        <Mini icon={Percent} label={acc.holdout ? "MAPE validación" : "MAPE ajuste"} value={pct(acc.mape)} />
        <Mini icon={Activity} label="MASE" value={acc.mase != null ? acc.mase.toFixed(2) : "—"} />
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

function Mini({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface-soft px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-text-muted" />
      <div className="min-w-0">
        <p className="truncate text-[10.5px] text-text-muted">{label}</p>
        <p className="font-display text-sm font-semibold text-text-primary tabular-nums">{value}</p>
      </div>
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
              <th className="px-4 py-3">Precisión</th>
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
                  <td className="px-4 py-3 tabular-nums">{p.accuracy_pct != null ? `${Math.round(p.accuracy_pct)}%` : "—"}</td>
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
