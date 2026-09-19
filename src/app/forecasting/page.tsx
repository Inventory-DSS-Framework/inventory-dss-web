"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CalendarRange, ChevronDown, Crown, FileSpreadsheet, Loader2, PackageCheck, SlidersHorizontal, Sparkles, Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorksButton } from "@/components/ftgm/HowItWorks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EngineProgress } from "@/components/ftgm/EngineProgress";
import { RunsHistory } from "@/components/ftgm/RunsHistory";
import { ScopeAnalysis } from "@/components/ftgm/ScopeAnalysis";
import { ScopePicker, scopeIsComplete } from "@/components/ftgm/ScopePicker";
import { frequencyLabel, num } from "@/components/ftgm/labels";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useExpertMode } from "@/hooks/useExpertMode";
import { usePlan } from "@/hooks/usePlan";
import { categoriesApi, productsApi, suppliersApi } from "@/lib/api";
import { dashboardApi, ftgmApi } from "@/lib/apis/ftgm";
import type { ProductDTO } from "@/types/api";
import type { ForecastScope, FtgmFrequency, FtgmRun, PreviewTotals, ScopePreview } from "@/types/ftgm";

/**
 * Shown when nothing in the scope is ready for the FTGM yet (typically a brand-new account):
 * says why, how much history each model needs, and takes the user to import it.
 */
function HistoryGuide({ totals, expert }: { totals: PreviewTotals; expert: boolean }) {
  const nothing = totals.products_included === 0;
  const needs = expert
    ? [
        ["1 semana completa", "baseline (promedio móvil)"],
        ["26 semanas con ventas regulares", "FTGM semanal"],
        ["24 meses", "FTGM mensual con estacionalidad"],
      ]
    : [
        ["1 semana de ventas", "un cálculo básico"],
        ["6 meses de ventas", "un cálculo semana a semana"],
        ["2 años de ventas", "un cálculo que entiende las temporadas del año"],
      ];
  return (
    <Card className="border-primary/25 bg-primary-softer/50">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-semibold text-text-primary">
              {nothing
                ? "Aún no tienes ventas suficientes para calcular"
                : expert
                  ? "Con esta historia el motor usará un baseline"
                  : "Con pocas ventas, el cálculo será aproximado"}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {expert ? (
                <>
                  El motor aprende de <strong>semanas o meses completos</strong> de ventas; las del periodo en curso entran
                  cuando ese periodo termina. Si tu negocio es nuevo en InventoryDSS, importa las ventas de tu sistema
                  anterior o de tu Excel y el pronóstico queda listo al instante.
                </>
              ) : (
                <>
                  Mientras más ventas pasadas tengas registradas, mejor será el cálculo. Si antes anotabas tus ventas en
                  un Excel o en otro sistema, <strong>súbelas aquí</strong> y el cálculo queda listo al instante.
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {needs.map(([need, gets]) => (
                <span key={need} className="rounded-full border border-border bg-surface px-3 py-1 text-text-secondary">
                  <strong className="text-text-primary">{need}</strong> → {gets}
                </span>
              ))}
            </div>
          </div>
        </div>
        <Link href="/sales?tab=imported" className="btn btn-primary shrink-0 gap-2 px-4 py-2.5 text-sm">
          <FileSpreadsheet className="h-4 w-4" /> Subir mis ventas pasadas
        </Link>
      </div>
    </Card>
  );
}

const HORIZONS = [
  { days: 30, label: "1 mes" },
  { days: 90, label: "3 meses" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "12 meses" },
];
const FREQS: { value: FtgmFrequency; plain: string; plainHint: string; hint: string }[] = [
  {
    value: "auto",
    plain: "Automático (recomendado)",
    plainHint: "Elegimos lo mejor según cuántas ventas tengas.",
    hint: "Mensual con ≥ 24 meses, semanal con ≥ 26 semanas",
  },
  { value: "monthly", plain: "Mes a mes", plainHint: "Para negocios con 2 años o más de ventas.", hint: "Estacionalidad anual (T = 12)" },
  { value: "weekly", plain: "Semana a semana", plainHint: "Para negocios con pocos meses de ventas.", hint: "Más detalle para historias cortas (T = 52)" },
];

/** Plain description of what will be calculated. */
function describeScope(scope: ForecastScope, productOf: (id: string) => ProductDTO | undefined): string {
  switch (scope.type) {
    case "recent_sales":
      return `Los productos que vendiste en los últimos ${scope.months ?? 12} meses.`;
    case "all":
      return "Todo tu catálogo.";
    case "supplier":
      return "Los productos del proveedor que elegiste.";
    case "seller":
      return "Los productos que vende la persona que elegiste.";
    case "category":
      return "Los productos de la categoría que elegiste.";
    case "products": {
      const ids = scope.product_ids ?? [];
      if (ids.length === 0) return "Aún no elegiste un producto.";
      if (ids.length === 1) return productOf(ids[0])?.name ?? "1 producto.";
      return `${ids.length} productos que elegiste.`;
    }
    default:
      return "";
  }
}

export default function ForecastingPage() {
  return (
    <Suspense fallback={null}>
      <ForecastingFlow />
    </Suspense>
  );
}

function ForecastingFlow() {
  const companyId = useCompanyId();
  const router = useRouter();
  const params = useSearchParams();
  const presetProduct = params.get("product");
  const { isPremium, loading: planLoading } = usePlan();
  const [expert] = useExpertMode();

  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const suppliers = useApi(() => (companyId ? suppliersApi.list(companyId).catch(() => []) : Promise.resolve([])), [companyId]);
  const categories = useApi(() => (companyId ? categoriesApi.list(companyId).catch(() => []) : Promise.resolve([])), [companyId]);
  const users = useApi(() => (companyId ? ftgmApi.companyUsers(companyId).catch(() => []) : Promise.resolve([])), [companyId]);
  const runs = useApi(() => (companyId ? ftgmApi.listRuns(companyId) : Promise.resolve([])), [companyId]);
  // Free plan works with one product: preselect the best seller so the owner doesn't have to choose.
  const summary = useApi(
    () => (companyId && !isPremium && !presetProduct ? dashboardApi.erpSummary(companyId).catch(() => null) : Promise.resolve(null)),
    [companyId, isPremium, presetProduct],
  );
  const topProductId = summary.data?.top_products?.[0]?.product_id ?? null;

  const productOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products.data]);

  const [step, setStep] = useState<1 | 2>(1);
  const [scope, setScope] = useState<ForecastScope>({ type: "products", product_ids: [] });
  const [scopeTouched, setScopeTouched] = useState(false);
  const [frequency, setFrequency] = useState<FtgmFrequency>("auto");
  const [horizon, setHorizon] = useState(90);
  const [preview, setPreview] = useState<ScopePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [activeRun, setActiveRun] = useState<FtgmRun | null>(null);
  const [advanced, setAdvanced] = useState(false);

  // Default scope: ?product preselects one product; Premium starts on "vendidos en 12 meses";
  // free plan starts on the best-selling product.
  useEffect(() => {
    if (scopeTouched || planLoading) return;
    if (presetProduct) setScope({ type: "products", product_ids: [presetProduct] });
    else if (isPremium) setScope({ type: "recent_sales", months: 12 });
    else if (topProductId) setScope({ type: "products", product_ids: [topProductId] });
  }, [presetProduct, isPremium, planLoading, scopeTouched, topProductId]);

  const analyze = useCallback(
    async (freq: FtgmFrequency = frequency) => {
      if (!companyId) return null;
      setPreviewing(true);
      setError(null);
      try {
        const data = await ftgmApi.previewScope(companyId, { scope, frequency: freq });
        setPreview(data);
        setStep(2);
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo revisar tus ventas.");
        return null;
      } finally {
        setPreviewing(false);
      }
    },
    [companyId, scope, frequency],
  );

  const launch = async () => {
    if (!companyId) return;
    setLaunching(true);
    setError(null);
    try {
      const run = await ftgmApi.createRun(companyId, { scope, horizon_days: horizon, frequency });
      setActiveRun(run);
      runs.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo lanzar el motor FTGM.");
    } finally {
      setLaunching(false);
    }
  };

  /** One click: check the sales history and, if there is something to calculate, run it right away. */
  const quickRun = async () => {
    const data = await analyze();
    if (data && data.totals.products_included > 0) await launch();
  };

  // Poll the launched run; open the result when it finishes.
  const runRef = useRef(activeRun);
  runRef.current = activeRun;
  useEffect(() => {
    if (!activeRun || !companyId) return;
    if (activeRun.status === "success") {
      const t = setTimeout(() => router.push(`/forecasting/${activeRun.id}`), 900);
      return () => clearTimeout(t);
    }
    if (activeRun.status === "failed" || activeRun.status === "cancelled") return;
    const t = setInterval(async () => {
      const cur = runRef.current;
      if (!cur) return;
      try {
        setActiveRun(await ftgmApi.getRun(companyId, cur.id));
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [activeRun?.status, activeRun?.id, companyId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeScope = (s: ForecastScope) => {
    setScopeTouched(true);
    setScope(s);
    setPreview(null);
    setStep(1);
  };

  const ready = scopeIsComplete(scope) && !!companyId;
  const totals = preview?.totals;
  const busy = previewing || launching;
  const periodsHint = useMemo(() => {
    const f = totals?.frequency === "weekly" || frequency === "weekly" ? 7 : 30.4;
    return Math.max(1, Math.ceil(horizon / f - 1e-6));
  }, [horizon, frequency, totals?.frequency]);
  const horizonText = HORIZONS.find((h) => h.days === horizon)?.label ?? `${horizon} días`;
  // Nothing preselected (free plan without sales yet): open the options so the owner can pick a product.
  const showAdvanced = advanced || (!ready && !planLoading && !summary.loading && !products.loading);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <PageHeader
        eyebrow="Planifica tus compras"
        eyebrowTone="violet"
        title={expert ? "Pronóstico de demanda" : "¿Cuánto venderé?"}
        description={
          expert
            ? "Elige qué productos analizar, revisa lo que el motor va a leer de tus ventas y lanza un pronóstico con modelo de Fourier."
            : "Miramos tus ventas pasadas y te decimos cuánto venderás de cada producto y qué te conviene comprar."
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <HowItWorksButton />
            {!isPremium && !planLoading && (
              <Link href="/premium" className="btn btn-secondary h-10 gap-2 px-4 text-sm">
                <Crown className="h-4 w-4 text-accent-violet" /> Calcular todo mi catálogo
              </Link>
            )}
          </div>
        }
      />

      {error && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}

      {/* Simple launcher: one button with sensible defaults */}
      <Card className="border-accent-violet/25 bg-accent-violet-soft/15">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-violet-soft text-accent-violet">
              <Sparkles className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-text-primary">Calcula cuánto venderás en los próximos {horizonText}</p>
              <p className="mt-1 text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Qué vamos a calcular:</span> {describeScope(scope, productOf)}
              </p>
              <p className="mt-1 text-xs text-text-muted">Toma menos de un minuto. Al terminar te mostramos qué comprar.</p>
            </div>
          </div>
          <Button variant="violet" size="lg" className="shrink-0" disabled={!ready || busy} onClick={quickRun}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Calcular cuánto venderé
          </Button>
        </div>

        <div className="mt-5 border-t border-border/70 pt-4">
          <button
            type="button"
            onClick={() => setAdvanced(!showAdvanced)}
            aria-expanded={showAdvanced}
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent-violet hover:opacity-80"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Opciones avanzadas
            <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
          </button>
          {!showAdvanced && (
            <p className="mt-1 text-xs text-text-muted">Elegir otros productos, para cuánto tiempo calcular y cómo agrupar tus ventas.</p>
          )}
        </div>
      </Card>

      {preview && totals && totals.products_ready === 0 && !advanced && (
        <HistoryGuide totals={totals} expert={expert} />
      )}

      {showAdvanced && (
        <div className="space-y-8 animate-fade-up">
          {expert && <Stepper step={preview ? 2 : 1} />}

          {/* Step 1 */}
          <section className="space-y-4">
            <SectionTitle
              n={1}
              title={expert ? "¿A qué le aplicamos el motor FTGM?" : "¿De qué productos quieres saber?"}
              subtitle={expert ? "El historial se construye directo de las ventas registradas en tu ERP." : "Usamos las ventas que registras en el sistema."}
            />
            <ScopePicker
              scope={scope}
              onChange={changeScope}
              isPremium={isPremium}
              products={products.data ?? []}
              suppliers={suppliers.data ?? []}
              categories={categories.data ?? []}
              users={users.data ?? []}
            />
          </section>

          {/* Horizon + frequency (defaults: 3 meses, automático) */}
          <section className="space-y-4">
            <SectionTitle
              n={2}
              title={expert ? "Horizonte y frecuencia" : "¿Para cuánto tiempo?"}
              subtitle={expert ? "Cuánto quieres ver hacia adelante y con qué frecuencia agrupa el motor." : "Si no sabes, deja lo que ya está marcado."}
            />
            <Card>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    <CalendarRange className="h-3.5 w-3.5" /> {expert ? "Horizonte" : "Calcular para los próximos"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {HORIZONS.map((h) => (
                      <button
                        key={h.days}
                        type="button"
                        onClick={() => setHorizon(h.days)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                          horizon === h.days
                            ? "border-accent-violet bg-accent-violet text-surface"
                            : "border-border bg-surface text-text-secondary hover:border-accent-violet/40",
                        )}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{expert ? "Frecuencia" : "Agrupar mis ventas"}</p>
                  <div className="space-y-1.5">
                    {FREQS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => {
                          setFrequency(f.value);
                          if (preview) analyze(f.value);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                          frequency === f.value ? "border-accent-violet/50 bg-surface" : "border-transparent hover:bg-surface/60",
                        )}
                      >
                        <span>
                          <span className="block text-sm font-semibold text-text-primary">{expert ? frequencyLabel[f.value] : f.plain}</span>
                          <span className="block text-[11px] text-text-muted">{expert ? f.hint : f.plainHint}</span>
                        </span>
                        <span className={cn("h-3.5 w-3.5 rounded-full border-2", frequency === f.value ? "border-accent-violet bg-accent-violet" : "border-border")} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            {step === 1 && (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" size="lg" disabled={!ready || busy} onClick={() => analyze()}>
                  {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {expert ? "Analizar datos" : "Revisar mis ventas antes de calcular"}
                </Button>
                <Button variant="violet" size="lg" disabled={!ready || busy} onClick={quickRun}>
                  {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Calcular cuánto venderé
                </Button>
              </div>
            )}
          </section>

          {/* Review what the engine will read */}
          {preview && companyId && (
            <section className="space-y-4 animate-fade-up">
              <SectionTitle
                n={3}
                title={expert ? "Antes de pronosticar" : "Tus ventas, revisadas"}
                subtitle={
                  expert
                    ? `${preview.totals.description} · corte al ${preview.totals.as_of}. Abre un producto para ver su stock, reabastecimientos y cómo le fue a su último pronóstico.`
                    : "Esto es lo que usaremos para calcular. Abre un producto para ver su detalle."
                }
              />
              {preview.products.length === 0 ? (
                <Card className="py-10 text-center text-sm text-text-secondary">
                  Ningún producto coincide con lo que elegiste. Prueba con otro periodo, proveedor o categoría.
                </Card>
              ) : (
                <>
                  {preview.totals.products_ready === 0 && <HistoryGuide totals={preview.totals} expert={expert} />}
                  <ScopeAnalysis companyId={companyId} preview={preview} />
                </>
              )}
            </section>
          )}

          {/* Launch after review */}
          {preview && totals && totals.products_included > 0 && (
            <section className="space-y-4 animate-fade-up">
              <Card className="border-accent-violet/25 bg-accent-violet-soft/15">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-violet-soft text-accent-violet">
                      <PackageCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-sm">
                      {expert ? (
                        <>
                          <p className="font-display font-semibold text-text-primary">Con esto se va al motor FTGM</p>
                          <p className="mt-1 text-text-secondary">
                            <strong className="text-text-primary">{totals.products_included}</strong> producto(s) ·{" "}
                            <strong className="text-text-primary">{num(totals.total_data_points)}</strong> periodos ·{" "}
                            {frequencyLabel[totals.frequency ?? "auto"]}
                          </p>
                          <p className="text-xs text-text-muted">
                            {totals.date_start} → {totals.date_end} · ~{periodsHint} periodo(s) a pronosticar
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-display font-semibold text-text-primary">Todo listo para calcular</p>
                          <p className="mt-1 text-text-secondary">
                            Vamos a calcular <strong className="text-text-primary">{totals.products_included}</strong> producto(s) para los
                            próximos {horizonText}, usando tus ventas desde {totals.date_start ?? "el inicio"}.
                          </p>
                        </>
                      )}
                      {totals.products_excluded > 0 && (
                        <details className="mt-2 text-xs text-text-muted">
                          <summary className="cursor-pointer">
                            {expert ? `${totals.products_excluded} excluido(s)` : `${totals.products_excluded} producto(s) no se pueden calcular todavía`}
                          </summary>
                          <ul className="mt-1 space-y-0.5">
                            {totals.excluded.map((x) => (
                              <li key={x.product_id}>
                                <span className="text-text-secondary">{x.name}</span>
                                {expert && <>: {x.reason}</>}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                  <Button variant="violet" size="lg" className="shrink-0" onClick={launch} disabled={busy}>
                    {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {expert ? "Ejecutar motor FTGM" : "Calcular cuánto venderé"}
                  </Button>
                </div>
              </Card>
            </section>
          )}
        </div>
      )}

      <section className="space-y-3">
        <RunsHistory runs={runs.data ?? []} />
      </section>

      <Modal
        open={!!activeRun}
        onClose={() => activeRun && ["failed", "cancelled", "success"].includes(activeRun.status) && setActiveRun(null)}
        title={expert ? "Motor FTGM" : "Calculando cuánto venderás"}
        description={activeRun?.scope_description ?? undefined}
        size="md"
        footer={
          activeRun && (activeRun.status === "failed" || activeRun.status === "cancelled") ? (
            <Button variant="secondary" onClick={() => setActiveRun(null)}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          ) : activeRun ? (
            <Link href={`/forecasting/${activeRun.id}`} className="btn btn-ghost h-9 gap-1.5 px-3 text-sm">
              {expert ? "Ver en segundo plano" : "Seguir mientras calcula"} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      >
        {activeRun && <EngineProgress status={activeRun.status} productCount={activeRun.product_count} error={activeRun.error_message} />}
      </Modal>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 }) {
  const items = ["Alcance", "Análisis", "Horizonte y ejecución"];
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {items.map((label, i) => {
        const on = i + 1 <= step + (step === 2 ? 1 : 0);
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                on ? "bg-accent-violet-soft text-accent-violet" : "bg-surface-muted text-text-muted",
              )}
            >
              <span className={cn("grid h-4 w-4 place-items-center rounded-full text-[10px]", on ? "bg-accent-violet text-surface" : "bg-border")}>
                {i + 1}
              </span>
              {label}
            </span>
            {i < items.length - 1 && <span className="h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function SectionTitle({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-violet text-sm font-bold text-surface">{n}</span>
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">{title}</h2>
        {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
      </div>
    </div>
  );
}
