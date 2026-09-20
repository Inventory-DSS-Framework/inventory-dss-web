"use client";

import { useMemo } from "react";
import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "the AI is working" stage of /forecasting.
 *
 * This is the showcase animation that used to open /premium, re-skinned for light mode:
 * the demand history draws itself, the stock-outs get repaired, the "HOY" line drops and
 * the forecast grows out of the last real point with its confidence band. It runs while
 * the run is being computed, in step with the four processing messages.
 */

type Style = React.CSSProperties & Record<`--${string}`, string>;
const d = (s: number): Style => ({ "--d": `${s}s` });

const W = 800;
const H = 300;
const TOP = 30;
const BOTTOM = 250;
const HIST = 40;
const FUT = 12;
const X0 = 30;
const X_TODAY = 548;
const X1 = 770;
const DIPS = [21, 34];

function rand(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}
const trueDemand = (i: number) => 58 + 0.55 * i + 22 * Math.sin((2 * Math.PI * i) / 13);
const toY = (v: number) => BOTTOM - ((v - 10) / 120) * (BOTTOM - TOP);
const hx = (i: number) => X0 + (i / (HIST - 1)) * (X_TODAY - X0);
const fx = (j: number) => X_TODAY + (j / FUT) * (X1 - X_TODAY);

type Pt = [number, number];

/** Catmull-Rom → cubic Bézier for a calm, smooth line. */
function smooth(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let p = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    p += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return p;
}

function useChart() {
  return useMemo(() => {
    const hist: Pt[] = Array.from({ length: HIST }, (_, i) => {
      const v = DIPS.includes(i) ? 14 : trueDemand(i) + rand(i) * 12;
      return [hx(i), toY(v)];
    });
    const last = hist[HIST - 1];
    // The projection starts exactly on the last observed point: no jump, no broken line.
    const fc: Pt[] = [last, ...Array.from({ length: FUT }, (_, k) => [fx(k + 1), toY(trueDemand(HIST + k))] as Pt)];
    const upper: Pt[] = fc.map(([x], k) => [x, toY(trueDemand(HIST - 1 + k) + 4 + k * 2.1)]);
    const lower: Pt[] = fc.map(([x], k) => [x, toY(trueDemand(HIST - 1 + k) - 4 - k * 2.1)]);
    upper[0] = last;
    lower[0] = last;
    const band = `${smooth(upper)} L${lower[lower.length - 1][0]},${lower[lower.length - 1][1]} ${smooth(
      [...lower].reverse(),
    ).replace(/^M/, "L")} Z`;
    const corrections = DIPS.map((i) => smooth([hist[i - 1], [hx(i), toY(trueDemand(i))], hist[i + 1]]));
    const area = `${smooth(hist)} L${X_TODAY},${BOTTOM} L${X0},${BOTTOM} Z`;
    return { hist: smooth(hist), histPts: hist, area, fc: smooth(fc), band, corrections };
  }, []);
}

function Pill({ x, y, delay, children }: { x: number; y: number; delay: number; children: React.ReactNode }) {
  return (
    <div className="absolute" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: "translate(-50%, -100%)" }}>
      <div
        className="ps-rise flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary shadow-soft"
        style={d(delay)}
      >
        <span className="ps-pulse h-1.5 w-1.5 rounded-full bg-accent-violet" />
        {children}
      </div>
    </div>
  );
}

export function PredictingStage({ stages, stage, products }: { stages: string[]; stage: number; products: number }) {
  const c = useChart();
  const peak = c.histPts[16];

  return (
    <div className="ia-stage relative overflow-hidden rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 40% at 50% 0%, rgb(var(--c-accent) / 0.10), transparent 70%)," +
            "radial-gradient(35% 35% at 92% 100%, rgb(var(--c-primary) / 0.08), transparent 70%)",
        }}
      />

      <div className="relative text-center">
        <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-accent-violet to-primary shadow-[0_18px_50px_-14px_rgb(var(--c-accent)/0.55)]">
          <span className="absolute inset-0 rounded-xl bg-accent-violet/30" style={{ animation: "brain-pump 2.2s ease-in-out infinite" }} />
          <Sparkles className="star-twinkle absolute -right-2 -top-2 h-4 w-4 text-warning" />
          <Sparkles className="star-twinkle absolute -bottom-2 -left-2.5 h-3.5 w-3.5 text-accent-violet" style={{ animationDelay: "0.7s" }} />
          <Brain className="relative z-10 h-8 w-8 text-white" style={{ animation: "brain-pump 2.2s ease-in-out infinite" }} />
        </div>

        <p key={stage} className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-text-primary">
          {stages[stage].split(" ").map((w, i) => (
            <span key={`${stage}-${i}`} className="ps-word mr-[0.24em] last:mr-0" style={d(i * 0.09)}>
              {w}
            </span>
          ))}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
          La IA está leyendo {products} producto(s) de tus ventas. Esto toma menos de un minuto.
        </p>

        <div className="mx-auto mt-5 flex max-w-[260px] items-center gap-1.5">
          {stages.map((s, i) => (
            <span
              key={s}
              className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i <= stage ? "bg-accent-violet" : "bg-surface-muted")}
            />
          ))}
        </div>
      </div>

      {/* The engine scene: history draws, gaps get repaired, the forecast grows out of today. */}
      <div className="relative mx-auto mt-8 w-full max-w-4xl" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-label="La IA proyectando tu demanda">
          <defs>
            <linearGradient id="ia-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-primary))" stopOpacity="0.20" />
              <stop offset="100%" stopColor="rgb(var(--c-primary))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ia-band" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.30" />
              <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3, 4].map((k) => {
            const y = TOP + (k * (BOTTOM - TOP)) / 4;
            return <line key={k} x1={X0} x2={X1} y1={y} y2={y} stroke="rgb(var(--c-text))" strokeOpacity="0.07" strokeDasharray="2 6" />;
          })}

          <rect
            x={X_TODAY}
            y={TOP - 16}
            width={X1 - X_TODAY + 16}
            height={BOTTOM - TOP + 16}
            fill="rgb(var(--c-accent))"
            fillOpacity="0.04"
            className="ps-fade"
            style={d(1.5)}
          />

          <path d={c.area} fill="url(#ia-area)" className="ps-wipe" style={{ "--d": "0.3s", "--t": "1.7s" } as Style} />
          <path
            d={c.hist}
            pathLength={1}
            fill="none"
            stroke="rgb(var(--c-primary))"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ps-draw"
            style={{ "--d": "0.3s", "--t": "1.7s" } as Style}
          />

          {c.corrections.map((p, k) => (
            <path key={k} d={p} fill="none" stroke="rgb(var(--c-warning))" strokeWidth="2" strokeDasharray="4 5" className="ps-fade" style={d(2.3 + k * 0.15)} />
          ))}

          <g className="ps-fade" style={d(1.6)}>
            <line x1={X_TODAY} x2={X_TODAY} y1={TOP - 12} y2={BOTTOM} stroke="rgb(var(--c-text))" strokeOpacity="0.25" strokeDasharray="3 4" />
            <text x={X_TODAY} y={BOTTOM + 20} textAnchor="middle" fontSize="11" fill="rgb(var(--c-text))" fillOpacity="0.5" letterSpacing="1.5">
              HOY
            </text>
          </g>

          <path d={c.band} fill="url(#ia-band)" className="ps-wipe" style={{ "--d": "1.85s", "--t": "1.2s" } as Style} />
          <path
            d={c.fc}
            pathLength={1}
            fill="none"
            stroke="rgb(var(--c-accent))"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="6 5"
            className="ps-draw"
            style={{ "--d": "1.85s", "--t": "1.2s" } as Style}
          />

          <circle cx={peak[0]} cy={peak[1]} r="4" fill="rgb(var(--c-accent))" className="ps-pop" style={d(2.1)} />
          <text x={X0} y={BOTTOM + 20} fontSize="11" fill="rgb(var(--c-text))" fillOpacity="0.4">
            Tus ventas pasadas
          </text>
          <text x={X1} y={BOTTOM + 20} textAnchor="end" fontSize="11" fill="rgb(var(--c-accent))" fillOpacity="0.85">
            Lo que viene
          </text>
        </svg>

        <Pill x={peak[0]} y={peak[1] - 12} delay={2.2}>
          Estacionalidad detectada
        </Pill>
        <Pill x={hx(DIPS[1])} y={toY(trueDemand(DIPS[1])) - 16} delay={2.55}>
          Quiebres corregidos
        </Pill>
        <Pill x={fx(7)} y={toY(trueDemand(HIST + 7) + 22)} delay={2.9}>
          Banda de confianza
        </Pill>
      </div>
    </div>
  );
}
