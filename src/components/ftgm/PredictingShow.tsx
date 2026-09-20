"use client";

import { ArrowRight, Boxes, Brain, CalendarRange, ChevronsRight, Crown, Infinity as InfinityIcon, ShieldAlert, ShoppingCart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, SceneRail, Words, d, useSceneSequence } from "@/components/premium/scene-kit";
import { EngineScene } from "./PredictingStage";

/**
 * The AI stage: a short presentation that plays while the engine computes.
 *
 * Four scenes — the hook, the engine drawing your demand, what your plan gives you,
 * and your own numbers — each in step with one of the four processing messages. It is
 * the same sequence that used to open /premium, now where the AI actually works.
 */

const SCENES_MS = [2900, 4300, 3400, 3000];
/** The flow holds the results until the show has told its whole story. */
export const SHOW_MS = SCENES_MS.reduce((a, b) => a + b, 0);

const RAIL = ["Anticípate", "El motor", "Tu plan", "Tu negocio"];

export const SHOW_STAGES = [
  "Procesando la data…",
  "Haciendo cálculos…",
  "Limpiando ruido…",
  "Generando recomendaciones…",
];

interface Props {
  products: number;
  horizonLabel: string;
  quota: { remaining: number | null; monthly_limit: number | null } | null;
  isPremium?: boolean;
  /** The run already finished: the person can jump straight to the results. */
  ready?: boolean;
  onSkip?: () => void;
  reduced?: boolean;
}

export function PredictingShow({ products, horizonLabel, quota, isPremium = false, ready = false, onSkip, reduced = false }: Props) {
  const { scene, leaving, run, go } = useSceneSequence(SCENES_MS, { enabled: !reduced });

  return (
    <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
      {/* The scene itself owns the middle of the screen. */}
      <div className="relative min-h-0 flex-1">
        <div
          key={`${run}-${scene}`}
          className={cn("absolute inset-0 flex items-center justify-center", leaving ? "ps-scene-out" : "ps-scene-in")}
        >
          {scene === 0 && <SceneHook />}
          {scene === 1 && <SceneEngineWork />}
          {scene === 2 && <ScenePlan quota={quota} isPremium={isPremium} />}
          {scene === 3 && <SceneYours products={products} horizonLabel={horizonLabel} />}
        </div>
      </div>

      {/* The status bar: what the AI is doing right now, and how far the show has gone. */}
      <div className="relative shrink-0 px-5 pb-8 pt-4 sm:px-8">
        <div className="mx-auto max-w-xl space-y-4 text-center">
          <p key={scene} className="flex items-center justify-center gap-2 text-sm font-medium ps-fg-2">
            <span className="ps-pulse h-1.5 w-1.5 rounded-full" style={{ background: "rgb(var(--ps-hi))" }} />
            {SHOW_STAGES[scene]}
          </p>
          <SceneRail labels={RAIL} durations={SCENES_MS} scene={scene} leaving={leaving} run={run} onGo={reduced ? undefined : go} />
          <div className="flex min-h-[40px] items-center justify-center">
            {ready && onSkip ? (
              <button type="button" onClick={onSkip} className="btn ps-btn-light h-10 gap-2 rounded-full px-5 text-sm">
                Ver mis resultados <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <p className="text-xs ps-fg-3">
                La IA está leyendo {products} producto{products === 1 ? "" : "s"} · esto toma menos de un minuto
                {onSkip && (
                  <button type="button" onClick={onSkip} className="ml-2 inline-flex items-center gap-1 underline-offset-2 hover:underline">
                    Saltar <ChevronsRight className="h-3 w-3" />
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 1 · El gancho ─────────────────────────────────────────────────────────── */

function SceneHook() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8 grid h-16 w-16 place-items-center rounded-2xl ps-glass">
        <span className="absolute inset-0 rounded-2xl" style={{ background: "rgb(var(--ps-hi) / 0.16)", animation: "brain-pump 2.2s ease-in-out infinite" }} />
        <Sparkles className="star-twinkle absolute -right-2 -top-2 h-4 w-4" style={{ color: "rgb(var(--ps-hi))" }} />
        <Brain className="relative z-10 h-8 w-8 ps-hi" style={{ animation: "brain-pump 2.2s ease-in-out infinite" }} />
      </div>
      <h2 className="font-display text-[clamp(2rem,5.6vw,4.4rem)] font-semibold leading-[1.04] tracking-[-0.035em]">
        <Words text="Tus ventas ya cuentan una historia." start={0.15} step={0.1} className="block ps-fg-2" />
        <Words text="La IA la está leyendo." start={1.05} step={0.16} className="mt-2 block ps-hi" />
      </h2>
    </div>
  );
}

/* ── 2 · El motor ──────────────────────────────────────────────────────────── */

function SceneEngineWork() {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center px-6">
      <div className="mb-5 text-center sm:mb-7">
        <Eyebrow>El motor</Eyebrow>
        <h2 className="ps-rise mt-3 font-display text-[clamp(1.6rem,3.8vw,2.8rem)] font-semibold tracking-[-0.03em] ps-fg" style={d(0.1)}>
          Aprende el ritmo de tu demanda.
        </h2>
        <p className="ps-rise mx-auto mt-2 max-w-xl text-sm ps-fg-2" style={d(0.25)}>
          Separa tendencia, estacionalidad y ruido; repara los quiebres de stock y proyecta lo que viene.
        </p>
      </div>
      <EngineScene className="mx-auto w-full max-w-4xl" />
    </div>
  );
}

/* ── 3 · Tu plan ───────────────────────────────────────────────────────────── */

const PERKS = [
  { icon: Boxes, title: "Todo tu catálogo", desc: "Cada producto en una sola corrida." },
  { icon: ShoppingCart, title: "Qué comprar", desc: "Cuánto pedir y cuándo hacerlo." },
  { icon: ShieldAlert, title: "Riesgo de quiebre", desc: "Alertas antes de quedarte sin stock." },
];

function ScenePlan({ quota, isPremium }: { quota: Props["quota"]; isPremium: boolean }) {
  const limit = quota?.monthly_limit ?? 3;
  const left = quota?.remaining;

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center px-6 text-center">
      <Eyebrow>Tu plan</Eyebrow>
      <h2 className="mt-4 font-display text-[clamp(1.7rem,4.2vw,3.1rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
        {isPremium ? (
          <>
            <Words text="Premium activo:" start={0.1} step={0.12} className="ps-fg-2" />{" "}
            <Words text="predices sin límite." start={0.4} step={0.14} className="ps-hi" />
          </>
        ) : (
          <>
            <Words text={`En el plan gratis tienes ${limit} predicciones al mes.`} start={0.1} step={0.09} className="block ps-fg-2" />
            <Words text="Con Premium, las que necesites." start={0.95} step={0.13} className="mt-2 block ps-hi" />
          </>
        )}
      </h2>

      {!isPremium && typeof left === "number" && (
        <div className="ps-rise mx-auto mt-6 flex items-center gap-2" style={d(1.5)}>
          {Array.from({ length: limit }).map((_, i) => (
            <span
              key={i}
              className="h-2.5 w-10 rounded-full transition-colors"
              style={{ background: i < limit - left ? "rgb(var(--ps-hi))" : "rgb(var(--ps-fg) / 0.16)" }}
              title={i < limit - left ? "usada" : "disponible"}
            />
          ))}
          <span className="ml-2 text-xs ps-fg-3">
            {left} de {limit} disponibles este mes
          </span>
        </div>
      )}

      <div className="mx-auto mt-9 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
        {PERKS.map((p, i) => (
          <div key={p.title} className="ps-rise ps-glass rounded-2xl p-4 text-left" style={d(1.7 + i * 0.12)}>
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl" style={{ background: "rgb(var(--ps-hi) / 0.14)" }}>
              <p.icon className="h-[18px] w-[18px] ps-hi" />
            </div>
            <p className="font-display text-[15px] font-semibold ps-fg">{p.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed ps-fg-2">{p.desc}</p>
          </div>
        ))}
      </div>

      {!isPremium && (
        <p className="ps-fade mt-6 inline-flex items-center justify-center gap-1.5 self-center text-xs ps-fg-3" style={d(2.3)}>
          <Crown className="h-3.5 w-3.5 ps-hi" /> Premium quita el límite y suma seguimiento y reportes
          <InfinityIcon className="h-3.5 w-3.5 ps-hi" />
        </p>
      )}
    </div>
  );
}

/* ── 4 · Tu negocio ────────────────────────────────────────────────────────── */

function SceneYours({ products, horizonLabel }: { products: number; horizonLabel: string }) {
  const tiles = [
    { icon: Boxes, value: String(products), label: products === 1 ? "producto analizado" : "productos analizados" },
    { icon: CalendarRange, value: horizonLabel, label: "hacia adelante" },
    { icon: ShoppingCart, value: "1", label: "plan de compra listo" },
  ];
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center px-6 text-center">
      <Eyebrow>Tu negocio</Eyebrow>
      <h2 className="mt-4 font-display text-[clamp(1.6rem,4vw,2.9rem)] font-semibold leading-[1.14] tracking-[-0.03em]">
        <Words text="Ya casi:" start={0.1} step={0.12} className="ps-fg-2" />{" "}
        <Words text="qué comprar, cuánto y cuándo." start={0.35} step={0.11} className="ps-hi" />
      </h2>
      <div className="mx-auto mt-9 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t, i) => (
          <div key={t.label} className="ps-rise ps-glass rounded-2xl px-4 py-5" style={d(0.8 + i * 0.14)}>
            <t.icon className="mx-auto mb-2 h-4 w-4 ps-fg-3" />
            <p className="font-display text-3xl font-semibold ps-fg">{t.value}</p>
            <p className="mt-1 text-xs ps-fg-3">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
