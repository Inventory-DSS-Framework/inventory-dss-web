"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HISTORY = [120, 138, 131, 152, 170, 158, 176, 194, 188];
const FORECAST = [201, 214, 226, 219];
const BAND = [9, 17, 25, 31];

const W = 500;
const H = 170;
const MIN = 95;
const MAX = 270;
const step = W / (HISTORY.length + FORECAST.length - 1);
const px = (i: number) => i * step;
const py = (v: number) => H - ((v - MIN) / (MAX - MIN)) * H;

type Pt = { x: number; y: number };
function smooth(pts: Pt[]) {
  return pts.reduce((acc, p, i, a) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const p0 = a[i - 2] ?? a[i - 1];
    const p1 = a[i - 1];
    const p3 = a[i + 1] ?? p;
    const c1 = { x: p1.x + (p.x - p0.x) / 6, y: p1.y + (p.y - p0.y) / 6 };
    const c2 = { x: p.x - (p3.x - p1.x) / 6, y: p.y - (p3.y - p1.y) / 6 };
    return `${acc} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p.x} ${p.y}`;
  }, "");
}

const histPts = HISTORY.map((v, i) => ({ x: px(i), y: py(v) }));
const last = histPts[histPts.length - 1];
const fcPts = [last, ...FORECAST.map((v, i) => ({ x: px(HISTORY.length + i), y: py(v) }))];
const upper = [last, ...FORECAST.map((v, i) => ({ x: px(HISTORY.length + i), y: py(v + BAND[i]) }))];
const lower = [last, ...FORECAST.map((v, i) => ({ x: px(HISTORY.length + i), y: py(v - BAND[i]) }))];
const bandPath = `${smooth(upper)} L ${lower[lower.length - 1].x} ${lower[lower.length - 1].y} ${smooth([...lower].reverse()).replace(/^M [^C]+/, "")} Z`;
const histPath = smooth(histPts);
const areaPath = `${histPath} L ${last.x} ${H} L 0 ${H} Z`;

function useCount(target: number, decimals = 0, delay = 500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / 1200));
      setV(target * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delay]);
  return v.toFixed(decimals);
}

/** A glass forecast card that tilts toward the cursor, with a moving glare and parallax tiles. */
export function ForecastPreview({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  const units = useCount(412, 0, 700);
  const precision = useCount(91.6, 1, 900);
  const mase = useCount(0.74, 2, 1000);
  const coverage = useCount(38, 0, 1100);

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({ ry: (x - 0.5) * 14, rx: -(y - 0.5) * 12, gx: x * 100, gy: y * 100, active: true });
  };

  return (
    <div className={cn("[perspective:1200px]", className)}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false })}
        className="glass relative w-full max-w-[580px] rounded-[28px] p-6 shadow-soft-xl"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: "preserve-3d",
          transition: tilt.active ? "transform 0.12s ease-out" : "transform 0.8s var(--ease-out)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px] transition-opacity duration-500"
          style={{
            opacity: tilt.active ? 1 : 0,
            background: `radial-gradient(420px circle at ${tilt.gx}% ${tilt.gy}%, rgb(255 255 255 / 0.22), transparent 45%)`,
          }}
        />

        <div className="flex items-start justify-between gap-4" style={{ transform: "translateZ(30px)" }}>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">SKU-002 · próximos 4 meses</p>
            <p className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-text-primary">Alimento Premium Gato 3kg</p>
          </div>
          <span className="badge inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> IA
          </span>
        </div>

        <div className="mt-4 flex items-end gap-6" style={{ transform: "translateZ(40px)" }}>
          <div>
            <p className="font-display text-[44px] font-semibold leading-none tracking-[-0.04em] text-text-primary tabular-nums">
              {units}
              <span className="ml-1 text-lg font-medium text-text-muted">u</span>
            </p>
            <p className="mt-1.5 text-xs text-text-secondary">demanda estimada · oct → ene</p>
          </div>
          <div className="mb-1 rounded-xl border border-primary/20 bg-primary-softer px-3 py-2">
            <p className="text-[11px] text-text-muted">Sugerencia</p>
            <p className="text-sm font-semibold text-primary">Reponer 180 u antes del 14/10</p>
          </div>
        </div>

        <svg viewBox={`0 -12 ${W} ${H + 24}`} className="mt-5 w-full overflow-visible" style={{ transform: "translateZ(20px)" }}>
          <defs>
            <linearGradient id="fp-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-primary))" stopOpacity="0.22" />
              <stop offset="100%" stopColor="rgb(var(--c-primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgb(var(--c-border))" strokeDasharray="3 6" />
          ))}
          <g style={{ animation: "reveal-x 1.6s var(--ease-out) 0.35s both" }}>
            <path d={areaPath} fill="url(#fp-area)" />
            <path d={bandPath} fill="rgb(var(--c-primary) / 0.12)" />
            <path d={histPath} fill="none" stroke="rgb(var(--c-primary))" strokeWidth="2.5" strokeLinecap="round" />
            <path d={smooth(fcPts)} fill="none" stroke="rgb(var(--c-primary))" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
          </g>
          <line x1={last.x} x2={last.x} y1="-8" y2={H} stroke="rgb(var(--c-text-muted) / 0.5)" strokeDasharray="2 4" />
          <text x={last.x + 6} y="0" className="fill-text-muted font-mono text-[10px]">HOY</text>
          <circle cx={last.x} cy={last.y} r="9" fill="rgb(var(--c-primary) / 0.18)">
            <animate attributeName="r" values="6;13;6" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={last.x} cy={last.y} r="4.5" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-primary))" strokeWidth="2.5" />
        </svg>

        <div className="mt-5 grid grid-cols-3 gap-3" style={{ transform: "translateZ(50px)" }}>
          {[
            { label: "Precisión", value: `${precision}%` },
            { label: "MASE", value: mase, hint: "< 1 supera al naive" },
            { label: "Cobertura", value: `${coverage} d` },
          ].map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-border/80 bg-surface/70 px-3.5 py-3">
              <p className="text-[11px] text-text-muted">{tile.label}</p>
              <p className="mt-0.5 font-display text-lg font-semibold tracking-[-0.02em] text-text-primary tabular-nums">{tile.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
