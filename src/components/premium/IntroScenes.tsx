"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  GitCompareArrows,
  Layers3,
  PackageSearch,
  ShieldAlert,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

type Style = React.CSSProperties & Record<`--${string}`, string>;
const d = (s: number): Style => ({ "--d": `${s}s` });

/* ── 1 · Hook ─────────────────────────────────────────────────────────────── */

function Words({ text, start, step, className }: { text: string; start: number; step: number; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="ps-word mr-[0.24em] last:mr-0" style={d(start + i * step)}>
          {w}
        </span>
      ))}
    </span>
  );
}

export function SceneHook() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="ps-fade mb-8 text-[11px] font-semibold uppercase tracking-[0.32em] ps-fg-3" style={d(0)}>
        Motor de IA
      </p>
      <h1 className="font-display text-[clamp(2.4rem,7vw,5.6rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
        <Words text="Tu negocio ya vende." start={0.15} step={0.14} className="block ps-fg-2" />
        <Words text="Ahora, anticípate." start={1.3} step={0.2} className="mt-2 block ps-hi" />
      </h1>
    </div>
  );
}

/* ── 2 · The engine ───────────────────────────────────────────────────────── */

const W = 800;
const H = 360;
const TOP = 40;
const BOTTOM = 300;
const HIST = 40;
const FUT = 12;
const X0 = 40;
const X_TODAY = 548;
const X1 = 760;
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

function Pill({ x, y, delay, children, align = "center" }: { x: number; y: number; delay: number; children: React.ReactNode; align?: "center" | "left" }) {
  return (
    <div
      className="absolute"
      style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: align === "center" ? "translate(-50%, -100%)" : "translate(0, -100%)" }}
    >
      <div className="ps-rise flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ps-glass ps-fg" style={d(delay)}>
        <span className="h-1.5 w-1.5 rounded-full ps-pulse" style={{ background: "rgb(var(--ps-hi))" }} />
        {children}
      </div>
    </div>
  );
}

export function SceneEngine() {
  const c = useChart();
  const peak = c.histPts[16];
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center px-6">
      <div className="mb-6 text-center sm:mb-8">
        <p className="ps-fade text-[11px] font-semibold uppercase tracking-[0.32em] ps-fg-3" style={d(0)}>El motor</p>
        <h2 className="ps-rise mt-3 font-display text-[clamp(1.7rem,4vw,3rem)] font-semibold tracking-[-0.03em] ps-fg" style={d(0.1)}>
          Aprende el ritmo de tu demanda.
        </h2>
        <p className="ps-rise mx-auto mt-2 max-w-xl text-sm ps-fg-2 sm:text-base" style={d(0.25)}>
          Modelo gris de Fourier variante en el tiempo: separa tendencia, estacionalidad y ruido, y proyecta lo que viene.
        </p>
      </div>

      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-label="Demanda histórica y pronóstico">
          <defs>
            <linearGradient id="ps-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--ps-fg))" stopOpacity="0.12" />
              <stop offset="100%" stopColor="rgb(var(--ps-fg))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ps-band" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgb(var(--ps-hi))" stopOpacity="0.32" />
              <stop offset="100%" stopColor="rgb(var(--ps-hi))" stopOpacity="0.1" />
            </linearGradient>
            <filter id="ps-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 1, 2, 3, 4].map((k) => {
            const y = TOP + (k * (BOTTOM - TOP)) / 4;
            return <line key={k} x1={X0} x2={X1} y1={y} y2={y} stroke="rgb(var(--ps-fg))" strokeOpacity="0.07" strokeDasharray="2 6" />;
          })}

          {/* future zone */}
          <rect x={X_TODAY} y={TOP - 20} width={X1 - X_TODAY + 20} height={BOTTOM - TOP + 20} fill="rgb(var(--ps-hi))" fillOpacity="0.035" className="ps-fade" style={d(1.5)} />

          <path d={c.area} fill="url(#ps-area)" className="ps-wipe" style={{ "--d": "0.35s", "--t": "1.7s" } as Style} />
          <path d={c.hist} pathLength={1} fill="none" stroke="rgb(var(--ps-fg))" strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ps-draw" style={{ "--d": "0.35s", "--t": "1.7s" } as Style} />

          {c.corrections.map((p, k) => (
            <path key={k} d={p} fill="none" stroke="rgb(var(--ps-hi))" strokeWidth="2" strokeDasharray="4 5" className="ps-fade" style={d(2.3 + k * 0.15)} />
          ))}

          <g className="ps-fade" style={d(1.6)}>
            <line x1={X_TODAY} x2={X_TODAY} y1={TOP - 16} y2={BOTTOM} stroke="rgb(var(--ps-fg))" strokeOpacity="0.28" strokeDasharray="3 4" />
            <text x={X_TODAY} y={BOTTOM + 22} textAnchor="middle" fontSize="11" fill="rgb(var(--ps-fg))" fillOpacity="0.55" letterSpacing="1.5">HOY</text>
          </g>

          <path d={c.band} fill="url(#ps-band)" className="ps-wipe" style={{ "--d": "1.85s", "--t": "1.2s" } as Style} />
          <path d={c.fc} pathLength={1} fill="none" stroke="rgb(var(--ps-hi))" strokeWidth="2.6" strokeLinecap="round" filter="url(#ps-soft-glow)" className="ps-draw" style={{ "--d": "1.85s", "--t": "1.2s" } as Style} />

          <circle cx={peak[0]} cy={peak[1]} r="4" fill="rgb(var(--ps-hi))" className="ps-pop" style={d(2.1)} />
          <text x={X0} y={BOTTOM + 22} fontSize="11" fill="rgb(var(--ps-fg))" fillOpacity="0.4">Últimas 40 semanas</text>
          <text x={X1} y={BOTTOM + 22} textAnchor="end" fontSize="11" fill="rgb(var(--ps-hi))" fillOpacity="0.8">+12 semanas</text>
        </svg>

        <Pill x={peak[0]} y={peak[1] - 14} delay={2.2}>Estacionalidad detectada</Pill>
        <Pill x={hx(DIPS[1])} y={toY(trueDemand(DIPS[1])) - 18} delay={2.55}>Quiebres corregidos</Pill>
        <Pill x={fx(7)} y={toY(trueDemand(HIST + 7) + 22)} delay={2.9}>Banda de confianza</Pill>
      </div>
    </div>
  );
}

/* ── 3 · Features ─────────────────────────────────────────────────────────── */

export const PREMIUM_FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: PackageSearch, title: "Pronóstico de todo tu catálogo", desc: "Cada producto, semana a semana, en una sola corrida." },
  { icon: GitCompareArrows, title: "Pronosticado vs real", desc: "Sigue la precisión del motor con tus ventas reales." },
  { icon: ShoppingCart, title: "Recomendaciones de compra", desc: "Qué pedir, cuánto y cuándo, listo para tu proveedor." },
  { icon: ShieldAlert, title: "Riesgo de quiebre y cobertura", desc: "Días de stock y alertas antes de quedarte sin nada." },
  { icon: Layers3, title: "Por proveedor, vendedor o categoría", desc: "Agrupa el pronóstico como tú gestionas el negocio." },
  { icon: BarChart3, title: "Reportes y KPIs", desc: "Indicadores claros para decidir y compartir." },
];

export function SceneFeatures() {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <p className="ps-fade text-[11px] font-semibold uppercase tracking-[0.32em] ps-fg-3" style={d(0)}>Premium</p>
        <h2 className="ps-rise mt-3 font-display text-[clamp(1.7rem,4vw,3rem)] font-semibold tracking-[-0.03em] ps-fg" style={d(0.1)}>
          Todo el motor, para todo tu negocio.
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {PREMIUM_FEATURES.map((f, i) => (
          <div key={f.title} className="ps-rise ps-glass rounded-2xl p-4 sm:p-5" style={d(0.35 + i * 0.12)}>
            <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl" style={{ background: "rgb(var(--ps-hi) / 0.14)" }}>
              <f.icon className="h-[18px] w-[18px] ps-hi" />
            </div>
            <p className="font-display text-[15px] font-semibold ps-fg">{f.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed ps-fg-2">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 4 · Personalized ─────────────────────────────────────────────────────── */

export interface CompanyStats {
  companyName: string | null;
  products: number | null;
  suppliers: number | null;
  sales: number | null;
  salesCapped: boolean;
}

function Counter({ value, delay, instant }: { value: number; delay: number; instant: boolean }) {
  const [n, setN] = useState(instant ? value : 0);
  useEffect(() => {
    if (instant) {
      setN(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const dur = 1300;
    const timer = window.setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / dur);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay * 1000);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, delay, instant]);
  return <span className="tabular-nums">{n.toLocaleString("es-PE")}</span>;
}

export function SceneYou({ stats, instant = false }: { stats: CompanyStats | null; instant?: boolean }) {
  const p = stats?.products ?? 0;
  const s = stats?.suppliers ?? 0;
  const hasNumbers = !!stats && p > 0;

  const tiles = [
    { label: "productos en tu catálogo", value: stats?.products },
    { label: "proveedores", value: stats?.suppliers },
    { label: stats?.salesCapped ? "ventas recientes (100+)" : "ventas registradas", value: stats?.sales },
  ].filter((t) => typeof t.value === "number") as { label: string; value: number }[];

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center px-6 text-center">
      <p className="ps-fade text-[11px] font-semibold uppercase tracking-[0.32em] ps-fg-3" style={d(0)}>
        {stats?.companyName ? `Para ${stats.companyName}` : "Para tu negocio"}
      </p>
      <h2 className="ps-rise mt-5 font-display text-[clamp(1.6rem,3.8vw,2.9rem)] font-semibold leading-[1.15] tracking-[-0.03em] ps-fg" style={d(0.1)}>
        {hasNumbers ? (
          <>
            Con tus <span className="ps-hi"><Counter value={p} delay={0.3} instant={instant} /> productos</span>
            {s > 0 && (
              <>
                {" "}y <span className="ps-hi"><Counter value={s} delay={0.45} instant={instant} /> {s === 1 ? "proveedor" : "proveedores"}</span>
              </>
            )}
            , la IA puede decirte <span className="whitespace-nowrap">qué comprar y cuándo.</span>
          </>
        ) : (
          <>Con tu catálogo y tus proveedores, la IA puede decirte qué comprar y cuándo.</>
        )}
      </h2>

      {tiles.length > 0 && (
        <div className="mx-auto mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          {tiles.map((t, i) => (
            <div key={t.label} className="ps-rise ps-glass rounded-2xl px-4 py-5" style={d(0.6 + i * 0.12)}>
              <p className="font-display text-3xl font-semibold ps-fg">
                <Counter value={t.value} delay={0.7 + i * 0.12} instant={instant} />
              </p>
              <p className="mt-1 text-xs ps-fg-3">{t.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
