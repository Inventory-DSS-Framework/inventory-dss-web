"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "./ExperienceProvider";

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/**
 * The layer behind the content panel. Base tier stays flat (a calm ERP); Premium gets
 * a slow aurora + a cursor light; the Motor FTGM stage gets the live forecast field.
 */
export function AmbientBackground() {
  const { tier, stage, motion } = useExperience();
  if (stage === "ftgm") return <ForecastStage animate={motion === "full"} />;
  if (tier === "premium") return <Aurora animate={motion === "full"} />;
  return null;
}

/** Tracks the pointer relative to `el` and writes --lx/--ly for CSS cursor lights. */
function useLocalPointer(ref: React.RefObject<HTMLDivElement | null>, onMove?: (x: number, y: number, inside: boolean) => void) {
  const cb = useRef(onMove);
  cb.current = onMove;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let ev: PointerEvent | null = null;
    const flush = () => {
      frame = 0;
      if (!ev) return;
      const r = el.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      el.style.setProperty("--lx", `${x}px`);
      el.style.setProperty("--ly", `${y}px`);
      cb.current?.(x, y, x >= 0 && y >= 0 && x <= r.width && y <= r.height);
    };
    const handler = (e: PointerEvent) => {
      ev = e;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handler);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}

function Aurora({ animate }: { animate: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLocalPointer(ref);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -inset-[20%]"
        style={{
          background:
            "radial-gradient(36% 30% at 16% 6%, rgb(var(--c-primary) / 0.13), transparent 70%)," +
            "radial-gradient(30% 26% at 90% 12%, rgb(var(--c-accent-2) / 0.13), transparent 70%)," +
            "radial-gradient(42% 36% at 72% 108%, rgb(var(--c-accent) / 0.09), transparent 70%)",
          animation: animate ? "aurora-drift 28s ease-in-out infinite alternate" : undefined,
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(720px circle at var(--lx, 50%) var(--ly, -30%), rgb(var(--c-glow) / 0.07), transparent 45%)" }}
      />
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

type Star = { x: number; y: number; vx: number; vy: number; r: number; c: number };

const GREEN = "46, 255, 168";
const CYAN = "0, 224, 255";
const MAGENTA = "255, 61, 190";
const STAR_COLORS = [GREEN, CYAN, MAGENTA] as const;
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/**
 * Motor FTGM backdrop. The sky keeps a faint field of drifting data points; the lower
 * half is a live demand chart — real history with its area, a "HOY" divider and the
 * forecast with a widening confidence band — slowly scrolling as time passes. The
 * cursor reads the chart like a crosshair: a marker and value at its position.
 */
function ForecastStage({ animate }: { animate: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false, energy: 0 });

  useLocalPointer(wrapRef, (x, y, inside) => {
    const p = pointer.current;
    if (p.x < -9000) {
      p.x = x;
      p.y = y;
    }
    p.tx = x;
    p.ty = y;
    p.inside = inside;
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;
    let running = true;

    const seed = () => {
      const count = Math.max(24, Math.min(70, Math.round((w * h) / 26000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.42,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.1 + 0.4,
        c: Math.random() < 0.7 ? 0 : Math.random() < 0.6 ? 1 : 2,
      }));
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const TAU = Math.PI * 2;

    const draw = (time: number) => {
      const t = animate ? time / 1000 : 0;
      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.16;
      p.y += (p.ty - p.y) * 0.16;
      p.energy += ((p.inside ? 1 : 0) - p.energy) * 0.07;

      ctx.clearRect(0, 0, w, h);

      // ── Sky: sparse data points ─────────────────────────────────────────
      ctx.globalCompositeOperation = "lighter";
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h * 0.42;
        if (s.y > h * 0.42) s.y = -10;
      }
      const LINK = 120;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const dx = a.x - b.x;
          if (dx > LINK || dx < -LINK) continue;
          const d = Math.hypot(dx, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${STAR_COLORS[a.c]}, ${(1 - d / LINK) * 0.09})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const s of stars) {
        ctx.fillStyle = `rgba(${STAR_COLORS[s.c]}, 0.75)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // ── Chart geometry ──────────────────────────────────────────────────
      // Sits low and quiet: it is a backdrop, never competing with the cards above it.
      const top = h * 0.6;
      const bottom = h * 0.95;
      const span = bottom - top;
      const today = w * 0.64;
      const shift = t * 0.012 * w; // px the series has scrolled
      const u = (x: number) => ((x + shift) / w) * 5;
      const real = (x: number) => {
        const k = u(x);
        return 0.5 + 0.17 * Math.sin(TAU * k * 0.9) + 0.08 * Math.sin(TAU * k * 2.2 + 1.3) + 0.04 * Math.sin(TAU * k * 4.6 + 2.1);
      };
      const model = (x: number) => {
        const k = u(x);
        return 0.5 + 0.17 * Math.sin(TAU * k * 0.9) + 0.08 * Math.sin(TAU * k * 2.2 + 1.3);
      };
      const other = (x: number) => {
        const k = u(x);
        return 0.28 + 0.07 * Math.sin(TAU * k * 1.3 + 0.6) + 0.03 * Math.sin(TAU * k * 3.4);
      };
      const spreadAt = (x: number) => 0.015 + Math.max(0, (x - today) / (w - today)) * 0.13;
      const yOf = (v: number) => bottom - v * span;
      const units = (v: number) => Math.round(40 + v * 200);

      ctx.font = "500 10px ui-monospace, SFMono-Regular, Menlo, monospace";

      // Horizontal gridlines + value axis.
      ctx.lineWidth = 1;
      for (let k = 0; k <= 4; k++) {
        const y = top + (k * span) / 4;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillText(`${units(1 - k / 4)} u`, 14, y - 6);
      }

      // Scrolling period ticks.
      const period = w / 10;
      const offset = shift % period;
      ctx.setLineDash([2, 6]);
      for (let x = -offset; x < w + period; x += period) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
        const idx = Math.round((x + shift) / period);
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillText(MONTHS[((idx % 12) + 12) % 12], x + 4, bottom + 18);
      }
      ctx.setLineDash([]);

      const STEP = 4;

      // Area under the real history.
      const area = ctx.createLinearGradient(0, top, 0, bottom);
      area.addColorStop(0, `rgba(${GREEN}, 0.08)`);
      area.addColorStop(1, `rgba(${GREEN}, 0)`);
      ctx.beginPath();
      ctx.moveTo(0, bottom);
      for (let x = 0; x <= today; x += STEP) ctx.lineTo(x, yOf(real(x)));
      ctx.lineTo(today, bottom);
      ctx.closePath();
      ctx.fillStyle = area;
      ctx.fill();

      // A second product, faint, for depth.
      ctx.beginPath();
      for (let x = 0; x <= today; x += STEP) (x === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, yOf(other(x)));
      ctx.strokeStyle = `rgba(${MAGENTA}, 0.16)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      for (let x = today; x <= w; x += STEP) (x === today ? ctx.moveTo : ctx.lineTo).call(ctx, x, yOf(other(x)));
      ctx.strokeStyle = `rgba(${MAGENTA}, 0.18)`;
      ctx.stroke();
      ctx.setLineDash([]);

      // Real history line (glow pass + crisp pass).
      const historyPath = () => {
        ctx.beginPath();
        for (let x = 0; x <= today; x += STEP) (x === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, yOf(real(x)));
      };
      historyPath();
      ctx.strokeStyle = `rgba(${GREEN}, 0.06)`;
      ctx.lineWidth = 6;
      ctx.stroke();
      historyPath();
      ctx.strokeStyle = `rgba(${GREEN}, 0.45)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Confidence band.
      ctx.beginPath();
      for (let x = today; x <= w + STEP; x += STEP) (x === today ? ctx.moveTo : ctx.lineTo).call(ctx, x, yOf(model(x) + spreadAt(x)));
      for (let x = w + STEP; x >= today; x -= STEP) ctx.lineTo(x, yOf(model(x) - spreadAt(x)));
      ctx.closePath();
      ctx.fillStyle = `rgba(${CYAN}, 0.05)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${CYAN}, 0.12)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Forecast line.
      const forecastPath = () => {
        ctx.beginPath();
        for (let x = today; x <= w + STEP; x += STEP) (x === today ? ctx.moveTo : ctx.lineTo).call(ctx, x, yOf(model(x)));
      };
      ctx.setLineDash([7, 6]);
      forecastPath();
      ctx.strokeStyle = `rgba(${CYAN}, 0.06)`;
      ctx.lineWidth = 6;
      ctx.stroke();
      forecastPath();
      ctx.strokeStyle = `rgba(${CYAN}, 0.45)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Observation markers on the history.
      const markStep = period / 4;
      for (let x = markStep - (shift % markStep); x < today; x += markStep) {
        const y = yOf(real(x));
        const near = p.energy > 0.05 ? Math.exp(-((x - p.x) ** 2) / (2 * 40 * 40)) * p.energy : 0;
        ctx.fillStyle = `rgba(${GREEN}, ${0.25 + near * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8 + near * 2.2, 0, TAU);
        ctx.fill();
      }

      // "HOY" divider.
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.beginPath();
      ctx.moveTo(today, top - 26);
      ctx.lineTo(today, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${GREEN}, 0.85)`;
      ctx.fillText("HOY", today - 30, top - 14);
      ctx.fillStyle = `rgba(${CYAN}, 0.7)`;
      ctx.fillText("PRONÓSTICO →", today + 8, top - 14);

      // Crosshair readout.
      if (p.energy > 0.04 && p.x > 0 && p.x < w) {
        const cx = p.x;
        const inForecast = cx >= today;
        const v = inForecast ? model(cx) : real(cx);
        const cy = yOf(v);
        const color = inForecast ? CYAN : GREEN;
        const a = p.energy;

        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 * a})`;
        ctx.beginPath();
        ctx.moveTo(cx, top - 10);
        ctx.lineTo(cx, bottom);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 * a})`;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = `rgba(${color}, ${0.18 * a})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(${color}, ${a})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, TAU);
        ctx.fill();

        const label = inForecast
          ? `Pronóstico · ${units(v)} u  ±${Math.round(spreadAt(cx) * 200)}`
          : `Real · ${units(v)} u`;
        ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
        const tw = ctx.measureText(label).width;
        const bw = tw + 20;
        const bh = 26;
        const bx = cx + 14 + bw > w ? cx - 14 - bw : cx + 14;
        const by = cy - bh - 10;
        ctx.fillStyle = `rgba(6, 8, 11, ${0.88 * a})`;
        ctx.strokeStyle = `rgba(${color}, ${0.45 * a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = `rgba(238, 244, 248, ${0.95 * a})`;
        ctx.fillText(label, bx + 10, by + 17);
      }

      if (running) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [animate]);

  return (
    <div ref={wrapRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 70% at 50% -12%, rgba(46,255,168,0.08), transparent 55%)," +
            "radial-gradient(70% 55% at 104% 104%, rgba(0,224,255,0.07), transparent 60%)," +
            "radial-gradient(55% 45% at -4% 100%, rgba(255,61,190,0.05), transparent 60%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(560px circle at var(--lx, -999px) var(--ly, -999px), rgba(46,255,168,0.06), transparent 45%)" }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(140% 100% at 50% 40%, transparent 55%, rgba(0,0,0,0.7) 100%)" }} />
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      {/* Glow filter used by chart curves on the stage (see globals.css). */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="dss-neon-glow" x="-10%" y="-60%" width="120%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}
