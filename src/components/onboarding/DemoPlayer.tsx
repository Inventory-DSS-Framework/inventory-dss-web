"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ArrowRight, Crown, Lock, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Stage, captionAt } from "./demo-kit";
import { FTGM_LOCK_AT, FtgmScene, ImportScene, MapScene, SaleScene, StageLockMark } from "./DemoScenes";

export type ChapterId = "map" | "import" | "sale" | "ftgm";

const CHAPTERS: Record<
  ChapterId,
  { title: string; duration: number; lockAt?: number; captions: [number, string][]; Scene: (p: { t: number }) => React.ReactElement }
> = {
  map: {
    title: "Tu mapa",
    duration: 10500,
    Scene: MapScene,
    captions: [
      [0, "Este es tu panel: el resumen de tu negocio en un vistazo."],
      [0.1, "Ventas: donde cobras cada día."],
      [0.34, "Compras: todo lo que entra a tu almacén."],
      [0.56, "Inventario: tu stock y tus columnas por tipo de producto."],
      [0.78, "Motor FTGM: cuánto venderás y qué comprar."],
    ],
  },
  import: {
    title: "Carga tu Excel",
    duration: 11000,
    Scene: ImportScene,
    captions: [
      [0, "Arrastra tu Excel o CSV tal como lo tienes."],
      [0.2, "Lo leemos en segundos."],
      [0.34, "Detectamos cada columna — y “Talla” se crea solo para Ropa."],
      [0.58, "¿Un dato mal escrito? Corrígelo directo en la vista previa."],
      [0.8, "Importa: tu inventario queda listo."],
    ],
  },
  sale: {
    title: "Vende",
    duration: 9500,
    Scene: SaleScene,
    captions: [
      [0, "Busca o escanea tus productos y se suman al carrito."],
      [0.46, "Elige cómo paga: efectivo, tarjeta, Yape, Plin o transferencia."],
      [0.72, "Cobra: se emite la boleta y el stock baja solo."],
    ],
  },
  ftgm: {
    title: "Motor FTGM",
    duration: 12000,
    lockAt: FTGM_LOCK_AT,
    Scene: FtgmScene,
    captions: [
      [0, "FTGM lee tu historial de ventas, producto por producto."],
      [0.3, "Detecta tendencia, estacionalidad y ciclos."],
      [0.54, "Calcula cuánto venderás y qué tan seguro es."],
      [0.8, "Y te dice qué comprar y cuándo."],
    ],
  },
};

export const ALL_CHAPTERS: ChapterId[] = ["map", "import", "sale", "ftgm"];

interface DemoPlayerProps {
  chapters?: ChapterId[];
  premium: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  /** "full" shows chapter tabs; "compact" only the caption and scrubber. */
  variant?: "full" | "compact";
  onFinished?: () => void;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * A product demo that plays like a video — but every frame is live UI, so it stays in
 * the user's theme and palette. On the free plan the FTGM chapter stops right where the
 * forecast would appear and the Premium wall drops in, inside the same animation.
 */
export function DemoPlayer({
  chapters = ALL_CHAPTERS,
  premium,
  autoPlay = true,
  loop = false,
  variant = "full",
  onFinished,
  onUpgrade,
  className,
}: DemoPlayerProps) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const idxRef = useRef(0);
  const elapsed = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const chapter = CHAPTERS[chapters[idx]];
  const t = Math.min(1, elapsed.current / chapter.duration);

  // Autoplay (unless the user prefers reduced motion).
  useEffect(() => {
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.getAttribute("data-motion") === "reduced";
    if (autoPlay && !reduced) setPlaying(true);
  }, [autoPlay]);

  // Pause when scrolled out of view, so looping previews don't burn frames.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Becoming premium lifts the wall.
  useEffect(() => {
    if (premium && locked) {
      setLocked(false);
      setPlaying(true);
    }
  }, [premium, locked]);

  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      elapsed.current += dt;
      const ch = CHAPTERS[chapters[idxRef.current]];
      const p = elapsed.current / ch.duration;

      if (ch.lockAt != null && !premium && p >= ch.lockAt) {
        elapsed.current = ch.lockAt * ch.duration;
        setLocked(true);
        setPlaying(false);
        rerender();
        return;
      }
      if (p >= 1) {
        if (idxRef.current < chapters.length - 1) {
          idxRef.current += 1;
          elapsed.current = 0;
          setIdx(idxRef.current);
        } else if (loop) {
          idxRef.current = 0;
          elapsed.current = 0;
          setIdx(0);
        } else {
          elapsed.current = ch.duration;
          setPlaying(false);
          setFinished(true);
          rerender();
          onFinishedRef.current?.();
          return;
        }
      }
      rerender();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, premium, loop, chapters]);

  const seek = useCallback((i: number) => {
    idxRef.current = i;
    elapsed.current = 0;
    setIdx(i);
    setLocked(false);
    setFinished(false);
    setPlaying(true);
  }, []);

  const toggle = () => {
    if (locked) return;
    if (finished) return seek(0);
    setPlaying((p) => !p);
  };

  const continueFree = () => {
    setLocked(false);
    if (idx < chapters.length - 1) seek(idx + 1);
    else {
      setFinished(true);
      onFinishedRef.current?.();
    }
  };

  const Scene = chapter.Scene;
  const caption = captionAt(t, chapter.captions);
  const totalDuration = chapters.reduce((a, id) => a + CHAPTERS[id].duration, 0);

  return (
    <div ref={rootRef} className={cn("overflow-hidden rounded-[22px] border border-border bg-surface shadow-soft-xl", className)}>
      <div className="relative">
        <button type="button" onClick={toggle} className="block w-full cursor-pointer text-left" aria-label={playing ? "Pausar demo" : "Reproducir demo"}>
          <Stage>
            <Scene t={t} />
            {locked && <StageLockMark />}
          </Stage>
        </button>

        {!playing && !locked && !finished && (
          <button
            type="button"
            onClick={toggle}
            className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-primary shadow-soft-xl backdrop-blur transition-transform hover:scale-105"
            aria-label="Reproducir"
          >
            <Play className="ml-0.5 h-6 w-6" />
          </button>
        )}

        {finished && !loop && (
          <div className="absolute inset-0 grid place-items-center bg-[rgb(var(--shadow-color)/0.25)] backdrop-blur-[2px]" style={{ animation: "fade-in 0.3s ease-out both" }}>
            <button type="button" onClick={() => seek(0)} className="btn btn-secondary h-10 gap-2 px-4 text-sm shadow-soft-lg">
              <RotateCcw className="h-4 w-4" /> Ver de nuevo
            </button>
          </div>
        )}

        {locked && (
          <div
            className="absolute inset-0 z-10 grid place-items-center px-4"
            style={{ background: "radial-gradient(60% 70% at 50% 55%, rgb(3 5 8 / 0.55), rgb(3 5 8 / 0.82))", backdropFilter: "blur(5px)", animation: "fade-in 0.5s ease-out both" }}
            role="dialog"
            aria-label="Función Premium"
          >
            <div className="w-full max-w-md text-center" style={{ animation: "fade-up 0.6s var(--ease-out) 0.15s both" }}>
              <div className="relative mx-auto grid h-16 w-16 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full" style={{ background: "rgb(167 139 250 / 0.25)", animationDuration: "2.2s" }} />
                <span className="relative grid h-16 w-16 place-items-center rounded-full border" style={{ borderColor: "rgb(167 139 250 / 0.5)", background: "rgb(167 139 250 / 0.14)", boxShadow: "0 0 40px rgb(167 139 250 / 0.45)" }}>
                  <Lock className="h-7 w-7 text-white" />
                </span>
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgb(167 139 250)" }}>Aquí empieza Premium</p>
              <h3 className="mt-2 font-display text-[clamp(1.1rem,2.4vw,1.5rem)] font-semibold text-white">Tu historial ya está analizado</h3>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-white/70">
                Con Premium, el Motor FTGM calcula cuánto venderás de todo tu catálogo y te dice qué comprar y cuándo.
              </p>
              <p className="mt-1.5 text-[11.5px] text-white/45">En el plan gratis puedes pronosticar 1 producto.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#05070a] transition-transform hover:scale-[1.03]"
                  style={{ background: "linear-gradient(135deg, rgb(52 211 153), rgb(167 139 250))" }}
                >
                  <Crown className="h-4 w-4" /> Desbloquear Premium
                </button>
                <button type="button" onClick={continueFree} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/10">
                  Seguir con plan gratis <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-2.5 border-t border-border px-4 py-3">
        <p key={`${idx}-${caption}`} className="min-h-[20px] text-[13.5px] font-medium text-text-primary" style={{ animation: "fade-up 0.35s var(--ease-out) both" }}>
          {caption}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={locked}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition-transform hover:scale-105 disabled:opacity-40"
            aria-label={playing ? "Pausar" : "Reproducir"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : finished ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
          </button>
          <div className="flex flex-1 items-center gap-1.5">
            {chapters.map((id, i) => {
              const ch = CHAPTERS[id];
              const fill = i < idx ? 1 : i === idx ? t : 0;
              const wall = ch.lockAt != null && !premium;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => seek(i)}
                  className="group relative h-5 flex-1"
                  style={{ flexGrow: ch.duration / totalDuration }}
                  aria-label={`Ir a ${ch.title}`}
                >
                  <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-surface-muted transition-[height] group-hover:h-2">
                    <span className={cn("block h-full rounded-full", id === "ftgm" ? "bg-accent-violet" : "bg-primary")} style={{ width: `${fill * 100}%` }} />
                  </span>
                  {wall && (
                    <span className="absolute top-1/2 grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-accent-violet/40 bg-surface text-accent-violet" style={{ left: `${(ch.lockAt ?? 0) * 100}%` }}>
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {variant === "full" && chapters.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {chapters.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => seek(i)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  i === idx ? "border-primary/35 bg-primary-soft text-primary" : "border-border text-text-secondary hover:text-text-primary",
                )}
              >
                <span className="tabular-nums opacity-60">{i + 1}</span> {CHAPTERS[id].title}
                {CHAPTERS[id].lockAt != null && !premium && <Lock className="h-3 w-3 text-accent-violet" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
