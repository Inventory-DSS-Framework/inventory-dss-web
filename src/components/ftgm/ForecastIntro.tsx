"use client";

import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChevronsRight,
  Eraser,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PremiumOverlay } from "@/components/premium/PremiumOverlay";
import { Eyebrow, FitToScreen, SceneRail, Words, d, useSceneSequence } from "@/components/premium/scene-kit";
import { EngineScene } from "./PredictingStage";

/**
 * What the person sees the moment they open "Predice tus ventas".
 *
 * Four scenes that say what the FTGM engine is and what it gives back, and a fifth
 * that explains the screen they are about to use. Green on black — the mirror image
 * of the Premium intro, which is the same idea on a light ground.
 */

const SCENES_MS = [3200, 4600, 3800, 3500, 800];
const RAIL = ["Predice", "El motor", "Cómo trabaja", "Qué obtienes", "Tu pantalla"];
const LAST = RAIL.length - 1;

export function ForecastIntro({ onClose, reduced = false }: { onClose: () => void; reduced?: boolean }) {
  const { scene, leaving, run, go, replay } = useSceneSequence(SCENES_MS, { enabled: !reduced });

  const skip =
    scene < LAST ? (
      <button type="button" onClick={() => go(LAST)} className="btn ps-btn-ghost h-9 gap-1.5 rounded-full px-3.5 text-[13px]">
        Omitir <ChevronsRight className="h-3.5 w-3.5" />
      </button>
    ) : null;

  return (
    <PremiumOverlay
      label="Motor FTGM — Predicción de demanda"
      onClose={onClose}
      actions={skip}
      subheader={<SceneRail labels={RAIL} durations={SCENES_MS} scene={scene} leaving={leaving} run={run} onGo={reduced ? undefined : go} />}
      brand={<Wordmark />}
      origin={null}
      forceDark
      scroll={false}
    >
      <div key={`${run}-${scene}`} className={cn("h-full", leaving ? "ps-scene-out" : "ps-scene-in")}>
        <FitToScreen>
          {scene === 0 && <SceneHook />}
          {scene === 1 && <SceneEngine />}
          {scene === 2 && <SceneHow />}
          {scene === 3 && <SceneValue />}
          {scene === LAST && <SceneOnboarding onStart={onClose} onReplay={reduced ? undefined : replay} />}
        </FitToScreen>
      </div>
    </PremiumOverlay>
  );
}

function Wordmark() {
  return (
    <div className="flex select-none items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-lg ps-glass">
        <Sparkles className="h-3.5 w-3.5 ps-hi" />
      </span>
      <span className="font-display text-[15px] font-semibold tracking-tight ps-fg">
        Motor <span className="font-medium ps-fg-3">FTGM</span>
      </span>
    </div>
  );
}

/* ── 1 · Predice ───────────────────────────────────────────────────────────── */

function SceneHook() {
  return (
    <div className="flex w-full flex-col items-center justify-center px-6 text-center">
      <Eyebrow>Predicción de demanda con IA</Eyebrow>
      <h2 className="mt-5 font-display text-[clamp(2rem,5.6vw,4.6rem)] font-semibold leading-[1.04] tracking-[-0.038em]">
        <Words text="Deja de adivinar cuánto comprar." start={0.15} step={0.1} className="block ps-fg-2" />
        <Words text="Predice cuánto vas a vender." start={1.1} step={0.15} className="mt-2 block ps-hi" />
      </h2>
      <p className="ps-fade mt-7 max-w-md text-sm ps-fg-3" style={d(2)}>
        El motor FTGM vive dentro de tu ERP: aprende de tus propias ventas, no de promedios ajenos.
      </p>
    </div>
  );
}

/* ── 2 · El motor ──────────────────────────────────────────────────────────── */

function SceneEngine() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col justify-center px-6">
      <div className="mb-4 text-center sm:mb-6">
        <Eyebrow>El motor</Eyebrow>
        <h2 className="ps-rise mt-2.5 font-display text-[clamp(1.5rem,3.7vw,2.7rem)] font-semibold tracking-[-0.03em] ps-fg" style={d(0.1)}>
          Aprende el ritmo de tu demanda.
        </h2>
        <p className="ps-rise mx-auto mt-2 max-w-2xl text-[13px] ps-fg-2 sm:text-sm" style={d(0.25)}>
          Modelo gris de Fourier variante en el tiempo: separa tendencia, estacionalidad y ruido, y proyecta lo que viene.
        </p>
      </div>
      <EngineScene className="mx-auto w-full max-w-4xl" />
    </div>
  );
}

/* ── 3 · Cómo trabaja ──────────────────────────────────────────────────────── */

const STEPS: { icon: LucideIcon; n: string; title: string; desc: string }[] = [
  { icon: Eraser, n: "01", title: "Limpia tu historial", desc: "Repara los quiebres de stock y los datos atípicos, para no aprender de tus errores de registro." },
  { icon: Activity, n: "02", title: "Encuentra el patrón", desc: "Descompone la serie en tendencia y estacionalidad: el ciclo real de cada producto." },
  { icon: TrendingUp, n: "03", title: "Proyecta con margen", desc: "No te da un número suelto, sino un rango probable para que decidas con criterio." },
];

function SceneHow() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col justify-center px-6">
      <div className="text-center">
        <Eyebrow>Cómo trabaja</Eyebrow>
        <h2 className="mt-3.5 font-display text-[clamp(1.5rem,3.9vw,2.9rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
          <Words text="Tres pasos" start={0.1} step={0.12} className="ps-fg-2" />{" "}
          <Words text="entre tus ventas y tu próxima compra." start={0.35} step={0.1} className="ps-hi" />
        </h2>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {STEPS.map((s, i) => (
          <div key={s.n} className="ps-rise ps-glass relative rounded-2xl p-5" style={d(1 + i * 0.16)}>
            <span className="absolute right-4 top-4 font-display text-[11px] font-bold tracking-[0.2em] ps-fg-3">{s.n}</span>
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl" style={{ background: "rgb(var(--ps-hi) / 0.14)" }}>
              <s.icon className="h-5 w-5 ps-hi" />
            </div>
            <p className="font-display text-base font-semibold ps-fg">{s.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed ps-fg-2">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 4 · Qué obtienes ──────────────────────────────────────────────────────── */

const VALUE: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: TrendingUp, title: "Cuánto venderás", desc: "Por producto y por periodo, con su rango probable." },
  { icon: ShoppingCart, title: "Qué comprar y cuánto", desc: "Cantidad sugerida y la inversión que significa." },
  { icon: CalendarClock, title: "Cuándo pedirlo", desc: "Con tu tiempo de proveedor ya considerado." },
  { icon: ShieldAlert, title: "Riesgo de quiebre", desc: "Para cuántos días te alcanza lo que tienes hoy." },
];

function SceneValue() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col justify-center px-6">
      <div className="text-center">
        <Eyebrow>Qué obtienes</Eyebrow>
        <h2 className="mt-3.5 font-display text-[clamp(1.5rem,3.9vw,2.9rem)] font-semibold leading-[1.12] tracking-[-0.03em]">
          <Words text="Cuatro respuestas" start={0.1} step={0.12} className="block ps-fg-2" />
          <Words text="que hoy tomas a ojo." start={0.5} step={0.14} className="mt-1.5 block ps-hi" />
        </h2>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {VALUE.map((v, i) => (
          <div key={v.title} className="ps-rise ps-glass flex items-start gap-3.5 rounded-2xl p-4" style={d(1 + i * 0.12)}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "rgb(var(--ps-hi) / 0.14)" }}>
              <v.icon className="h-5 w-5 ps-hi" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold ps-fg">{v.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed ps-fg-2">{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 5 · Tu pantalla · el onboarding ───────────────────────────────────────── */

const SCREEN_STEPS = [
  { title: "¿Qué quieres predecir?", desc: "Marca los productos. Solo salen los que tienen ventas suficientes." },
  { title: "¿Para cuánto tiempo?", desc: "1, 2 o 3 meses, según para qué estés comprando." },
  { title: "La IA trabaja", desc: "Tarda menos de un minuto. Puedes omitir la animación." },
  { title: "Resultados", desc: "Cuánto venderás, qué comprar, tus números y los reportes." },
];

function SceneOnboarding({ onStart, onReplay }: { onStart: () => void; onReplay?: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col justify-center px-6 text-center">
      <Eyebrow>Cómo usar esta pantalla</Eyebrow>
      <h2 className="ps-rise mt-3.5 font-display text-[clamp(1.5rem,3.9vw,2.8rem)] font-semibold leading-[1.12] tracking-[-0.03em] ps-fg" style={d(0.08)}>
        Cuatro pasos y ya. <span className="ps-hi">Empecemos.</span>
      </h2>

      <ol className="mt-8 space-y-2.5 text-left">
        {SCREEN_STEPS.map((s, i) => (
          <li key={s.title} className="ps-rise ps-glass flex items-start gap-3.5 rounded-2xl px-4 py-3" style={d(0.35 + i * 0.12)}>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-xs font-bold"
              style={{ background: "rgb(var(--ps-hi) / 0.16)", color: "rgb(var(--ps-hi))" }}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold ps-fg">{s.title}</p>
              <p className="text-[13px] leading-relaxed ps-fg-2">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="ps-fade mt-5 text-xs ps-fg-3" style={d(0.9)}>
        Arriba a la derecha siempre ves cuántas predicciones te quedan este mes.
      </p>

      <div className="ps-fade mt-7 flex flex-wrap items-center justify-center gap-3" style={d(1)}>
        <button type="button" onClick={onStart} className="btn ps-btn-light group h-11 gap-2 rounded-2xl px-7 text-[15px]">
          Empezar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
        {onReplay && (
          <button type="button" onClick={onReplay} className="btn h-11 rounded-2xl px-4 text-[13px] ps-fg-2 hover:text-[rgb(var(--ps-fg))]">
            Ver de nuevo
          </button>
        )}
      </div>
    </div>
  );
}
