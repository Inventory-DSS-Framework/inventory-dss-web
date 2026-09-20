"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * The engine scene of the prediction flow.
 *
 * This is the showcase animation that used to open /premium: the demand history draws
 * itself, the stock-outs get repaired, the "HOY" line drops and the forecast grows out of
 * the last real point with its confidence band. `PredictingShow` gives it the whole
 * screen while the run is computed.
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

/** The drawing itself. `labels` adds the axis captions and the callout pills. */
export function EngineScene({ labels = true, className }: { labels?: boolean; className?: string }) {
  const c = useChart();
  const peak = c.histPts[16];

  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: `${W} / ${H}` }}>
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
          {labels && (
            <text x={X_TODAY} y={BOTTOM + 20} textAnchor="middle" fontSize="11" fill="rgb(var(--c-text))" fillOpacity="0.5" letterSpacing="1.5">
              HOY
            </text>
          )}
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
        {labels && (
          <>
            <text x={X0} y={BOTTOM + 20} fontSize="11" fill="rgb(var(--c-text))" fillOpacity="0.4">
              Tus ventas pasadas
            </text>
            <text x={X1} y={BOTTOM + 20} textAnchor="end" fontSize="11" fill="rgb(var(--c-accent))" fillOpacity="0.85">
              Lo que viene
            </text>
          </>
        )}
      </svg>

      {labels && (
        <>
          <Pill x={peak[0]} y={peak[1] - 12} delay={2.2}>
            Estacionalidad detectada
          </Pill>
          <Pill x={hx(DIPS[1])} y={toY(trueDemand(DIPS[1])) - 16} delay={2.55}>
            Quiebres corregidos
          </Pill>
          <Pill x={fx(7)} y={toY(trueDemand(HIST + 7) + 22)} delay={2.9}>
            Banda de confianza
          </Pill>
        </>
      )}
    </div>
  );
}
