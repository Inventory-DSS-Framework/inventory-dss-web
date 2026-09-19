"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarRange, Crown, Loader2, PackageCheck, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { usePlan } from "@/hooks/usePlan";
import { categoriesApi, productsApi, suppliersApi } from "@/lib/api";
import { ftgmApi } from "@/lib/apis/ftgm";
import type { ForecastScope, FtgmFrequency, FtgmRun, ScopePreview } from "@/types/ftgm";

const HORIZONS = [
  { days: 30, label: "1 mes" },
  { days: 90, label: "3 meses" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "12 meses" },
];
const FREQS: { value: FtgmFrequency; hint: string }[] = [
  { value: "auto", hint: "Mensual con ≥ 24 meses, semanal con ≥ 26 semanas" },
  { value: "monthly", hint: "Estacionalidad anual (T = 12)" },
  { value: "weekly", hint: "Más detalle para historias cortas (T = 52)" },
];

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

  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const suppliers = useApi(() => (companyId ? suppliersApi.list(companyId).catch(() => []) : Promise.resolve([])), [companyId]);
  const categories = useApi(() => (companyId ? categoriesApi.list(companyId).catch(() => []) : Promise.resolve([])), [companyId]);
  const users = useApi(() => (companyId ? ftgmApi.companyUsers(companyId).catch(() => []) : Promise.resolve([])), [companyId]);
  const runs = useApi(() => (companyId ? ftgmApi.listRuns(companyId) : Promise.resolve([])), [companyId]);

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

  // Default scope: ?product preselects one product; Premium starts on "vendidos en 12 meses".
  useEffect(() => {
    if (scopeTouched || planLoading) return;
    if (presetProduct) setScope({ type: "products", product_ids: [presetProduct] });
    else if (isPremium) setScope({ type: "recent_sales", months: 12 });
  }, [presetProduct, isPremium, planLoading, scopeTouched]);

  const analyze = useCallback(
    async (freq: FtgmFrequency = frequency) => {
      if (!companyId) return;
      setPreviewing(true);
      setError(null);
      try {
        const data = await ftgmApi.previewScope(companyId, { scope, frequency: freq });
        setPreview(data);
        setStep(2);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo analizar el alcance.");
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
  const periodsHint = useMemo(() => {
    const f = totals?.frequency === "weekly" || frequency === "weekly" ? 7 : 30.4;
    return Math.max(1, Math.ceil(horizon / f - 1e-6));
  }, [horizon, frequency, totals?.frequency]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <PageHeader
        eyebrow="Motor FTGM"
        eyebrowTone="violet"
        title="Pronóstico de demanda"
        description="Elige qué productos analizar, revisa lo que el motor va a leer de tus ventas y lanza un pronóstico con modelo de Fourier."
        action={
          !isPremium && !planLoading ? (
            <Link href="/premium" className="btn btn-secondary h-10 gap-2 px-4 text-sm">
              <Crown className="h-4 w-4 text-accent-violet" /> Pronosticar todo el catálogo
            </Link>
          ) : undefined
        }
      />

      <Stepper step={preview ? 2 : 1} />

      {error && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}

      {/* Step 1 */}
      <section className="space-y-4">
        <SectionTitle n={1} title="¿A qué le aplicamos el motor FTGM?" subtitle="El historial se construye directo de las ventas registradas en tu ERP." />
        <ScopePicker
          scope={scope}
          onChange={changeScope}
          isPremium={isPremium}
          products={products.data ?? []}
          suppliers={suppliers.data ?? []}
          categories={categories.data ?? []}
          users={users.data ?? []}
        />
        {step === 1 && (
          <div className="flex justify-end">
            <Button variant="violet" size="lg" disabled={!ready || previewing} onClick={() => analyze()}>
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Analizar datos
            </Button>
          </div>
        )}
      </section>

      {/* Step 2 */}
      {preview && companyId && (
        <section className="space-y-4 animate-fade-up">
          <SectionTitle
            n={2}
            title="Antes de pronosticar"
            subtitle={`${preview.totals.description} · corte al ${preview.totals.as_of}. Abre un producto para ver su stock, reabastecimientos y cómo le fue a su último pronóstico.`}
          />
          {preview.products.length === 0 ? (
            <Card className="py-10 text-center text-sm text-text-secondary">
              Ningún producto coincide con este alcance. Prueba con otro periodo, proveedor o categoría.
            </Card>
          ) : (
            <ScopeAnalysis companyId={companyId} preview={preview} />
          )}
        </section>
      )}

      {/* Step 3 */}
      {preview && totals && totals.products_included > 0 && (
        <section className="space-y-4 animate-fade-up">
          <SectionTitle n={3} title="Horizonte y lanzamiento" subtitle="Cuánto quieres ver hacia adelante y con qué frecuencia agrupa el motor." />
          <Card className="border-accent-violet/25 bg-accent-violet-soft/15">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  <CalendarRange className="h-3.5 w-3.5" /> Horizonte
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Frecuencia</p>
                <div className="space-y-1.5">
                  {FREQS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => {
                        setFrequency(f.value);
                        analyze(f.value);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                        frequency === f.value ? "border-accent-violet/50 bg-surface" : "border-transparent hover:bg-surface/60",
                      )}
                    >
                      <span>
                        <span className="block text-sm font-semibold text-text-primary">{frequencyLabel[f.value]}</span>
                        <span className="block text-[11px] text-text-muted">{f.hint}</span>
                      </span>
                      <span className={cn("h-3.5 w-3.5 rounded-full border-2", frequency === f.value ? "border-accent-violet bg-accent-violet" : "border-border")} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-violet-soft text-accent-violet">
                    <PackageCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="font-display font-semibold text-text-primary">Con esto se va al motor FTGM</p>
                    <p className="mt-1 text-text-secondary">
                      <strong className="text-text-primary">{totals.products_included}</strong> producto(s) ·{" "}
                      <strong className="text-text-primary">{num(totals.total_data_points)}</strong> periodos ·{" "}
                      {frequencyLabel[totals.frequency ?? "auto"]}
                    </p>
                    <p className="text-xs text-text-muted">
                      {totals.date_start} → {totals.date_end} · ~{periodsHint} periodo(s) a pronosticar
                    </p>
                    {totals.products_excluded > 0 && (
                      <details className="mt-2 text-xs text-text-muted">
                        <summary className="cursor-pointer">{totals.products_excluded} excluido(s)</summary>
                        <ul className="mt-1 space-y-0.5">
                          {totals.excluded.map((x) => (
                            <li key={x.product_id}>
                              <span className="text-text-secondary">{x.name}:</span> {x.reason}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
                <Button variant="violet" size="lg" onClick={launch} disabled={launching || previewing}>
                  {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Ejecutar motor FTGM
                </Button>
              </div>
            </div>
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <RunsHistory runs={runs.data ?? []} />
      </section>

      <Modal
        open={!!activeRun}
        onClose={() => activeRun && ["failed", "cancelled", "success"].includes(activeRun.status) && setActiveRun(null)}
        title="Motor FTGM"
        description={activeRun?.scope_description ?? undefined}
        size="md"
        footer={
          activeRun && (activeRun.status === "failed" || activeRun.status === "cancelled") ? (
            <Button variant="secondary" onClick={() => setActiveRun(null)}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          ) : activeRun ? (
            <Link href={`/forecasting/${activeRun.id}`} className="btn btn-ghost h-9 gap-1.5 px-3 text-sm">
              Ver en segundo plano <ArrowRight className="h-4 w-4" />
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
