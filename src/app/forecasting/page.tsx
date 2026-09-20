"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BarChart2, Calendar, Check, CheckSquare, ChevronDown, Crown,
  FileText, Lightbulb, Loader2, Minimize2, Package, RotateCcw, Sparkles, Square, TrendingUp, Wand2, XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { HowItWorksButton } from "@/components/ftgm/HowItWorks";
import { Card } from "@/components/ui/Card";
import { RunsHistory } from "@/components/ftgm/RunsHistory";
import { RunResultView } from "@/components/ftgm/RunResultView";
import { PredictingShow, SHOW_MS } from "@/components/ftgm/PredictingShow";
import { PremiumBackdrop } from "@/components/premium/PremiumBackdrop";
import { prefersReducedMotion } from "@/components/premium/plan-data";
import { BuyPanel } from "@/components/ftgm/panels/BuyPanel";
import { NumbersPanel } from "@/components/ftgm/panels/NumbersPanel";
import { ReportsPanel } from "@/components/ftgm/panels/ReportsPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { markPremiumOrigin } from "@/lib/premium-origin";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { usePlan } from "@/hooks/usePlan";
import { ftgmApi } from "@/lib/apis/ftgm";
import type { FtgmRun, PreviewProduct } from "@/types/ftgm";

type Step = "what" | "when" | "running" | "results";
type View = "prediccion" | "comprar" | "numeros" | "reportes";

const VIEWS: { id: View; label: string; icon: typeof TrendingUp }[] = [
  { id: "prediccion", label: "Cuánto venderás", icon: TrendingUp },
  { id: "comprar", label: "Qué comprar", icon: Lightbulb },
  { id: "numeros", label: "Mis números", icon: BarChart2 },
  { id: "reportes", label: "Reportes", icon: FileText },
];
const isView = (v: string | null): v is View => VIEWS.some((x) => x.id === v);

const HORIZONS = [
  { days: 30, label: "1 mes", hint: "Para tu próxima compra" },
  { days: 60, label: "2 meses", hint: "Para planear con calma" },
  { days: 90, label: "3 meses", hint: "Para campañas y temporadas" },
];

const STEP_RAIL = [
  { id: "what", label: "¿Qué quieres predecir?" },
  { id: "when", label: "¿Para cuánto tiempo?" },
  { id: "running", label: "La IA trabaja" },
  { id: "results", label: "Resultados" },
];

const rise = (i: number): React.CSSProperties => ({ animation: `fade-up 0.55s var(--ease-out) ${0.05 + i * 0.06}s both` });

/**
 * Everything the AI does, on one page and in one flow:
 * 1) what do you want to predict (only items with enough sales are offered),
 * 2) for how long, 3) a light, staged "the AI is working" screen, and
 * 4) the results: the projection, what to buy, your numbers and the downloadable reports.
 */
export default function ForecastingPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const search = useSearchParams();
  const deepLinkProduct = search.get("product");
  const runParam = search.get("run");
  const vistaParam = search.get("vista");

  const [step, setStep] = useState<Step>(runParam || isView(vistaParam) ? "results" : "what");
  const [view, setView] = useState<View>(isView(vistaParam) ? vistaParam : "prediccion");
  const [activeRun, setActiveRun] = useState<string | null>(runParam);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [horizon, setHorizon] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<FtgmRun | null>(null);
  // The finished run, waiting for the show to end (or for the person to skip ahead).
  const [readyRun, setReadyRun] = useState<string | null>(null);

  const preview = useApi(
    () => (companyId ? ftgmApi.previewScope(companyId, { scope: { type: "all" } }) : Promise.resolve(null)),
    [companyId],
  );
  const plan = usePlan();
  const quota = useApi(
    () => (companyId ? ftgmApi.quota(companyId).catch(() => null) : Promise.resolve(null)),
    [companyId],
  );
  const runs = useApi(() => (companyId ? ftgmApi.listRuns(companyId, 8) : Promise.resolve([])), [companyId]);

  const products = preview.data?.products ?? [];
  // "Disponible" = el motor puede procesarlo: incluido en el alcance y con ventas suficientes
  // (un producto vendido una sola vez no da patrón que aprender).
  const available = useMemo(() => products.filter((p) => p.included && p.sales_count > 2), [products]);
  const unavailable = useMemo(() => products.filter((p) => !p.included || p.sales_count <= 2), [products]);

  // The run shown in the results step: the one asked for, else the latest successful one.
  const lastSuccess = (runs.data ?? []).find((r) => r.status === "success") ?? null;
  const shownRun = activeRun ?? lastSuccess?.id ?? null;

  // Deep links: /forecasting?run=… opens that result, ?vista=… opens that panel.
  useEffect(() => {
    if (runParam) {
      setActiveRun(runParam);
      setStep("results");
    } else if (isView(vistaParam)) {
      setView(vistaParam);
      setStep("results");
    }
  }, [runParam, vistaParam]);

  // When the current run was launched, so the processing stage can run its full course.
  const startedAt = useRef(0);

  // Deep link (/forecasting?product=id): preselect that product if it is predictable.
  const preselected = useRef(false);
  useEffect(() => {
    if (preselected.current || !deepLinkProduct || available.length === 0) return;
    if (available.some((p) => p.product_id === deepLinkProduct)) {
      preselected.current = true;
      setSelected(new Set([deepLinkProduct]));
    }
  }, [deepLinkProduct, available]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = available.length > 0 && available.every((p) => selected.has(p.product_id));
  const selectAll = () => setSelected(allSelected ? new Set() : new Set(available.map((p) => p.product_id)));

  const q = quota.data;
  const outOfQuota = q?.remaining === 0;

  // Only hand the results over once: the show's timer and the "ver resultados"
  // button race each other on purpose.
  const handedOver = useRef(false);

  const startOver = useCallback(() => {
    handedOver.current = false;
    setStep("what");
    setRun(null);
    setReadyRun(null);
    setError(null);
    setSelected(new Set());
    router.replace("/forecasting", { scroll: false });
  }, [router]);

  const finish = useCallback(
    (id: string) => {
      if (handedOver.current) return;
      handedOver.current = true;
      setActiveRun(id);
      setView("prediccion");
      setStep("results");
      runs.reload();
      quota.reload();
      router.replace(`/forecasting?run=${id}`, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router],
  );

  const launch = async () => {
    if (!companyId || selected.size === 0) return;
    setError(null);
    setStep("running");
    setReadyRun(null);
    handedOver.current = false;
    startedAt.current = Date.now();
    try {
      const created = await ftgmApi.createRun(companyId, {
        scope: allSelected ? { type: "all" } : { type: "products", product_ids: [...selected] },
        horizon_days: horizon,
        frequency: "auto",
      });
      setRun(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo lanzar la predicción con IA.");
      setStep("when");
      quota.reload();
    }
  };

  // While running: cycle the stage copy and poll the run until it lands on the results step.
  useEffect(() => {
    if (step !== "running" || !run || !companyId) return;
    const timers: number[] = [];
    const poll = window.setInterval(async () => {
      try {
        const r = await ftgmApi.getRun(companyId, run.id);
        if (r.status === "success") {
          window.clearInterval(poll);
          setReadyRun(r.id);
          // Let the show finish telling its story before handing over the results.
          const left = Math.max(0, SHOW_MS - (Date.now() - startedAt.current));
          timers.push(window.setTimeout(() => finish(r.id), left));
        } else if (r.status === "failed" || r.status === "cancelled") {
          window.clearInterval(poll);
          setError(r.error_message ?? "La predicción no pudo completarse. Inténtalo de nuevo.");
          setStep("when");
          quota.reload();
        }
      } catch {
        /* transient; keep polling */
      }
    }, 1500);
    return () => {
      window.clearInterval(poll);
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, run?.id, companyId]);

  const stepIdx = step === "what" ? 0 : step === "when" ? 1 : step === "running" ? 2 : 3;
  // Steps 1-3 are the prediction flow itself: full screen, no app chrome, dark stage.
  // The results (step 4) are a working screen, so they go back to the normal app.
  const immersive = step !== "results";

  // Dark theme + locked page while the flow is on, restoring whatever the person had.
  useEffect(() => {
    if (!immersive) return;
    const root = document.documentElement;
    const previous = root.getAttribute("data-mode");
    const scroll = document.body.style.overflow;
    root.setAttribute("data-mode", "dark");
    document.body.style.overflow = "hidden";
    return () => {
      if (previous) root.setAttribute("data-mode", previous);
      else root.removeAttribute("data-mode");
      document.body.style.overflow = scroll;
    };
  }, [immersive]);

  // The overlay is portaled to <body>: the page container animates transforms, which
  // would otherwise trap a `fixed` child inside the content area.
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setMounted(true);
    setReduced(prefersReducedMotion());
  }, []);


  const flow = (
    <>
      <PageHeader
        eyebrow="Predice con IA"
        eyebrowTone="violet"
        title="Predice tus ventas"
        description="La IA analiza tus ventas pasadas y te dice cuánto venderás, qué te conviene comprar y cómo están tus números."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <HowItWorksButton />
            {q?.monthly_limit != null && (
              <span
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold",
                  outOfQuota ? "border-warning/40 bg-warning-soft/50 text-warning" : "border-border bg-surface text-text-secondary",
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-accent-violet" />
                Te quedan {q.remaining} de {q.monthly_limit} este mes
              </span>
            )}
          </div>
        }
      />

      {/* Stepper rail: the same four steps, always visible except while the AI works. */}
      {step !== "running" && (
        <>
          <ol className="flex items-center gap-2" style={rise(0)}>
            {STEP_RAIL.map((s, i) => {
              const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "todo";
              return (
                <li key={s.id} className="flex flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                      state === "done" && "bg-primary text-on-primary",
                      state === "active" && "bg-accent-violet text-white",
                      state === "todo" && "bg-surface-muted text-text-muted",
                    )}
                  >
                    {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn("hidden truncate text-sm font-medium sm:block", state === "active" ? "text-text-primary" : "text-text-muted")}>
                    {s.label}
                  </span>
                  {i < STEP_RAIL.length - 1 && <span className="h-px flex-1 bg-border" />}
                </li>
              );
            })}
          </ol>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" style={rise(0)}>
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </>
      )}

      {/* ── Paso 1 · ¿Qué quieres predecir? ─────────────────────── */}
      {step === "what" && (
        <div className="space-y-5">
          <Card style={rise(1)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-violet">
                  <Wand2 className="h-3.5 w-3.5" /> Esto se hará con IA
                </p>
                <h2 className="mt-1.5 font-display text-xl font-semibold text-text-primary">¿Qué quieres predecir?</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Estos son tus <span className="font-semibold text-text-primary">ítems disponibles para aplicar predicción</span>:
                  los que tienen suficientes ventas para que la IA aprenda su ritmo.
                </p>
              </div>
              {available.length > 0 && (
                <button type="button" onClick={selectAll} className="btn btn-secondary h-10 gap-2 px-4 text-sm">
                  {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {allSelected ? "Quitar todos" : `Seleccionar todos (${available.length})`}
                </button>
              )}
            </div>

            {preview.loading && !preview.data ? (
              <p className="py-12 text-center text-sm text-text-muted">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Revisando tus ventas…
              </p>
            ) : available.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="mx-auto h-8 w-8 text-text-muted" />
                <p className="mt-3 text-sm font-semibold text-text-primary">Aún no hay productos listos para predecir</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
                  La IA necesita historial: carga tus ventas pasadas (Ventas › Ventas pasadas) o sigue vendiendo unas
                  semanas más y vuelve.
                </p>
                <Link href="/sales?tab=imported" className="btn btn-primary mt-4 h-10 gap-2 px-4 text-sm">
                  Cargar mis ventas <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((p) => {
                  const on = selected.has(p.product_id);
                  return (
                    <button
                      key={p.product_id}
                      type="button"
                      onClick={() => toggle(p.product_id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                        on ? "border-accent-violet/50 bg-accent-violet-soft/30 ring-2 ring-accent-violet/15" : "border-border bg-surface hover:border-accent-violet/30",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
                          on ? "border-accent-violet bg-accent-violet text-white" : "border-border bg-surface",
                        )}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-primary">{p.name}</span>
                        <span className="block text-[11px] text-text-muted">
                          {p.sales_count} ventas · {Math.round(p.total_units)} u en {p.periods} {p.frequency === "weekly" ? "semanas" : "meses"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {unavailable.length > 0 && (
              <div className="mt-4 border-t border-border-soft pt-3">
                <button
                  type="button"
                  onClick={() => setShowUnavailable((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-secondary"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showUnavailable && "rotate-180")} />
                  {unavailable.length} producto(s) aún no disponibles para predicción
                </button>
                {showUnavailable && (
                  <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {unavailable.map((p) => (
                      <li key={p.product_id} className="rounded-xl bg-surface-soft/70 px-3 py-2 text-xs text-text-muted">
                        <span className="font-medium text-text-secondary">{p.name}</span> — {reasonFor(p)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3" style={rise(2)}>
            {lastSuccess ? (
              <button type="button" onClick={() => setStep("results")} className="btn btn-ghost h-11 gap-1.5 px-4 text-sm">
                Ver mis últimos resultados <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setStep("when")}
              disabled={selected.size === 0}
              className="btn btn-violet h-12 gap-2 rounded-2xl px-6 text-[15px] disabled:opacity-50"
            >
              Continuar ({selected.size} {selected.size === 1 ? "producto" : "productos"}) <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3" style={rise(3)}>
            <h3 className="font-display text-base font-semibold text-text-primary">Predicciones anteriores</h3>
            <RunsHistory runs={runs.data ?? []} onSelect={(id) => { setActiveRun(id); setView("prediccion"); setStep("results"); }} />
          </div>
        </div>
      )}

      {/* ── Paso 2 · ¿Para cuánto tiempo? ───────────────────────── */}
      {step === "when" && (
        <div className="space-y-5">
          <Card style={rise(1)}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-violet">
              <Calendar className="h-3.5 w-3.5" /> Un dato más
            </p>
            <h2 className="mt-1.5 font-display text-xl font-semibold text-text-primary">¿Para cuánto tiempo quieres la predicción?</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {HORIZONS.map((h) => (
                <button
                  key={h.days}
                  type="button"
                  onClick={() => setHorizon(h.days)}
                  className={cn(
                    "rounded-xl border p-5 text-left transition-all",
                    horizon === h.days
                      ? "border-accent-violet/50 bg-accent-violet-soft/30 ring-2 ring-accent-violet/15"
                      : "border-border bg-surface hover:border-accent-violet/30",
                  )}
                >
                  <p className="font-display text-lg font-semibold text-text-primary">{h.label}</p>
                  <p className="text-sm text-text-secondary">{h.hint}</p>
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-text-secondary">
              Vas a predecir <span className="font-semibold text-text-primary">{selected.size} producto(s)</span> para{" "}
              <span className="font-semibold text-text-primary">{HORIZONS.find((h) => h.days === horizon)?.label}</span>.
            </p>
          </Card>

          {outOfQuota && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-warning/30 bg-warning-soft/40" style={rise(2)}>
              <p className="text-sm text-text-primary">
                Usaste tus {q?.monthly_limit} predicciones gratis de este mes. Con Premium predices sin límites.
              </p>
              <Link href="/premium" onClick={markPremiumOrigin} className="btn btn-primary h-10 gap-2 px-4 text-sm">
                <Crown className="h-4 w-4" /> Ver Premium
              </Link>
            </Card>
          )}

          <div className="flex items-center justify-between" style={rise(2)}>
            <button type="button" onClick={() => setStep("what")} className="btn btn-ghost h-11 gap-1.5 px-4 text-sm">
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
            <button
              type="button"
              onClick={() => void launch()}
              disabled={outOfQuota}
              className="btn btn-violet h-12 gap-2 rounded-2xl px-7 text-[15px] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" /> Predecir con IA
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 4 · Resultados y recomendaciones ───────────────── */}
      {step === "results" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3" style={rise(1)}>
            <nav className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors",
                    view === v.id ? "bg-accent-violet text-white shadow-[0_6px_18px_-8px_rgb(var(--c-accent)/0.8)]" : "text-text-secondary hover:bg-surface-soft hover:text-text-primary",
                  )}
                >
                  <v.icon className="h-4 w-4" /> {v.label}
                </button>
              ))}
            </nav>
            <button type="button" onClick={startOver} className="btn btn-secondary h-11 gap-2 px-4 text-sm">
              <RotateCcw className="h-4 w-4" /> Hacer otra predicción
            </button>
          </div>

          <div key={view} className="animate-fade-up">
            {view === "prediccion" &&
              (shownRun ? (
                <RunResultView companyId={companyId} runId={shownRun} />
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="Todavía no hiciste ninguna predicción"
                  description="Elige tus productos y deja que la IA calcule cuánto venderás en las próximas semanas."
                  action={{ label: "Predecir con IA", onClick: startOver }}
                />
              ))}
            {view === "comprar" && <BuyPanel companyId={companyId} onNewRun={startOver} />}
            {view === "numeros" && <NumbersPanel companyId={companyId} onNewRun={startOver} onGoToBuy={() => setView("comprar")} />}
            {view === "reportes" && <ReportsPanel companyId={companyId} />}
          </div>

          {view === "prediccion" && (runs.data?.length ?? 0) > 1 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-display text-base font-semibold text-text-primary">Predicciones anteriores</h3>
              <RunsHistory
                runs={runs.data ?? []}
                onSelect={(id) => {
                  setActiveRun(id);
                  setView("prediccion");
                }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );

  if (!immersive) {
    return (
      <div className="relative mx-auto max-w-[1400px] space-y-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 36% at 80% 0%, rgb(var(--c-accent) / 0.10), transparent 70%)," +
              "radial-gradient(40% 30% at 6% 12%, rgb(var(--c-primary) / 0.08), transparent 70%)",
          }}
        />
        {flow}
      </div>
    );
  }

  // Full screen: covers sidebar and topbar, so nothing competes with the flow. The
  // premium stage ground (slow glows, grain and demand curves that keep drawing)
  // stays under every step, so the screen is never a flat black.
  if (!mounted) return null;
  return createPortal(
    <div className="ps-root fixed inset-0 z-[60] flex flex-col overflow-hidden">
      <PremiumBackdrop />
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="absolute right-5 top-5 z-20 inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-medium ps-glass ps-fg-2 backdrop-blur transition-colors hover:text-[rgb(var(--ps-fg))]"
      >
        <Minimize2 className="h-4 w-4" /> Salir
      </button>

      {step === "running" ? (
        <PredictingShow
          products={selected.size}
          horizonLabel={HORIZONS.find((h) => h.days === horizon)?.label ?? "1 mes"}
          quota={q ? { remaining: q.remaining, monthly_limit: q.monthly_limit } : null}
          isPremium={plan.isPremium}
          ready={!!readyRun}
          onSkip={readyRun ? () => finish(readyRun) : undefined}
          reduced={reduced}
        />
      ) : (
        <div className="relative z-[1] min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1100px] space-y-8 px-5 py-12 lg:px-8">{flow}</div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function reasonFor(p: PreviewProduct): string {
  if (p.readiness === "sin_ventas") return "sin ventas registradas todavía";
  if (p.sales_count <= 2) return `solo ${p.sales_count === 1 ? "se vendió una vez" : `${p.sales_count} ventas`}: la IA necesita más historial`;
  return p.reason || "pocos datos todavía";
}
