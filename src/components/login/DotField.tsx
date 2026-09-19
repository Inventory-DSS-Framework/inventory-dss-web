"use client";

import { useEffect, useRef } from "react";

type RGB = [number, number, number];

const parse = (v: string, fallback: RGB): RGB => {
  const parts = v.trim().split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => !Number.isNaN(n)) ? (parts as RGB) : fallback;
};

/**
 * Login backdrop: a field of dots that draws a living demand chart — a curve made of
 * three Fourier harmonics with a tinted area beneath it and an uncertainty band that
 * widens past "hoy". A slow light sweeps the grid so it never looks idle; the dots
 * swell and part around the cursor, and a click sends a ripple through them.
 */
export function DotField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const SPACING = 22;
    const LEVELS = 8;
    let w = 0;
    let h = 0;
    let dots = new Float32Array(0);
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let base: RGB = [138, 150, 146];
    let hi: RGB = [12, 168, 132];
    let fc: RGB = [15, 118, 110];
    let dark = false;
    const readColors = () => {
      const s = getComputedStyle(document.documentElement);
      base = parse(s.getPropertyValue("--c-text-muted"), base);
      hi = parse(s.getPropertyValue("--c-primary"), hi);
      fc = parse(s.getPropertyValue("--c-accent"), fc);
      dark = document.documentElement.getAttribute("data-mode") === "dark";
    };
    readColors();
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.ceil(w / SPACING) + 1;
      const rows = Math.ceil(h / SPACING) + 1;
      const ox = (w - (cols - 1) * SPACING) / 2;
      const oy = (h - (rows - 1) * SPACING) / 2;
      dots = new Float32Array(cols * rows * 2);
      let k = 0;
      for (let c = 0; c < cols; c++) {
        for (let r2 = 0; r2 < rows; r2++) {
          dots[k++] = ox + c * SPACING;
          dots[k++] = oy + r2 * SPACING;
        }
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, energy: 0, inside: false };
    const ripples: { x: number; y: number; start: number }[] = [];

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = e.clientX - r.left;
      pointer.ty = e.clientY - r.top;
      if (pointer.x < -9000) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
      pointer.inside = true;
    };
    const onLeave = () => (pointer.inside = false);
    const onDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, start: performance.now() });
      if (ripples.length > 4) ripples.shift();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    const curve = (x: number, t: number) =>
      h * 0.6 +
      Math.sin(x * 0.0042 + t * 0.5) * h * 0.075 +
      Math.sin(x * 0.0105 - t * 0.75) * h * 0.034 +
      Math.sin(x * 0.021 + t * 1.2) * h * 0.013;

    // Three color families: resting grid, history (primary) and forecast (accent).
    const FAMILIES = 3;

    const draw = (now: number) => {
      const t = reduced ? 0 : now / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.14;
      pointer.y += (pointer.ty - pointer.y) * 0.14;
      pointer.energy += ((pointer.inside ? 1 : 0) - pointer.energy) * 0.06;

      ctx.clearRect(0, 0, w, h);
      const today = w * 0.64;
      const paths = Array.from({ length: LEVELS * FAMILIES }, () => new Path2D());

      for (let k = 0; k < dots.length; k += 2) {
        const x0 = dots[k];
        const y0 = dots[k + 1];
        const future = x0 >= today;
        const cy = curve(x0, t);

        // The line itself, and its band (wider in the future).
        const spread = future ? 18 + (x0 - today) * 0.12 : 18;
        const dy0 = y0 - cy;
        const band = Math.exp(-(dy0 * dy0) / (2 * spread * spread)) * (future ? 0.8 : 1);

        // Area under the history — fades with depth, like an area chart.
        const below = !future && dy0 > 0 ? Math.max(0, 1 - dy0 / (h * 0.32)) * 0.38 : 0;

        // Slow diagonal sweep of light so the resting grid feels alive.
        const sweep = Math.pow(0.5 + 0.5 * Math.sin(x0 * 0.0045 + y0 * 0.003 - t * 0.9), 10);

        const dx = x0 - pointer.x;
        const dy = y0 - pointer.y;
        const d2 = dx * dx + dy * dy;
        const f = Math.exp(-d2 / (2 * 115 * 115)) * pointer.energy;

        let rip = 0;
        for (const r of ripples) {
          const age = (now - r.start) / 1000;
          if (age > 1.3) continue;
          const dd = Math.hypot(x0 - r.x, y0 - r.y) - age * 560;
          rip += Math.exp(-(dd * dd) / (2 * 26 * 26)) * (1 - age / 1.3);
        }

        const d = Math.sqrt(d2) || 1;
        const push = f * 15 + rip * 9;
        const x = x0 + (dx / d) * push;
        const y = y0 + (dy / d) * push;

        const lit = Math.min(1, band * 0.95 + below + f * 0.9 + rip * 0.85);
        const intensity = lit > 0.14 ? lit : Math.min(1, sweep * 0.9);
        const family = lit > 0.14 ? (future ? 2 : 1) : 0;
        const radius = family === 0 ? 1.05 + sweep * 0.5 : 1.05 + lit * 1.8;
        const level = Math.min(LEVELS - 1, Math.floor(intensity * LEVELS));
        const path = paths[family * LEVELS + level];
        path.moveTo(x + radius, y);
        path.arc(x, y, radius, 0, Math.PI * 2);
      }

      for (let family = 0; family < FAMILIES; family++) {
        const [r, g, b] = family === 0 ? base : family === 1 ? hi : fc;
        for (let level = 0; level < LEVELS; level++) {
          const alpha =
            family === 0
              ? (dark ? 0.3 : 0.38) + (level / LEVELS) * 0.35
              : 0.32 + (level / LEVELS) * 0.68;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fill(paths[family * LEVELS + level]);
        }
      }

      // "Hoy" marker where history turns into forecast.
      const cy = curve(today, t);
      ctx.strokeStyle = `rgba(${hi[0]}, ${hi[1]}, ${hi[2]}, 0.4)`;
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(today, cy - 120);
      ctx.lineTo(today, cy + 140);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "600 10px ui-monospace, SFMono-Regular, monospace";
      ctx.fillStyle = `rgba(${hi[0]}, ${hi[1]}, ${hi[2]}, 0.9)`;
      ctx.fillText("HOY", today + 8, cy - 108);
      ctx.fillStyle = `rgba(${fc[0]}, ${fc[1]}, ${fc[2]}, 0.75)`;
      ctx.fillText("PRONÓSTICO →", today + 8, cy - 94);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} style={{ width: "100%", height: "100%" }} />;
}
