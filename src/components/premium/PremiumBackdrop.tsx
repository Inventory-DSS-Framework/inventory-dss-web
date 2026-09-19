"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Deep themed ground with slow glows, dot grain and a vignette — plus a light that
 * follows the cursor and faint forecast lines that keep drawing themselves behind
 * the content, so every scene sits on a quietly moving chart.
 */
export function PremiumBackdrop({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let ev: PointerEvent | null = null;
    const flush = () => {
      frame = 0;
      if (!ev) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lx", `${ev.clientX - r.left}px`);
      el.style.setProperty("--ly", `${ev.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      ev = e;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="ps-glow ps-glow-a left-[-10%] top-[-20%] h-[60vmax] w-[60vmax]" />
      <div className="ps-glow ps-glow-b right-[-15%] top-[10%] h-[48vmax] w-[48vmax]" />
      <div className="ps-glow ps-glow-c bottom-[-30%] left-[20%] h-[50vmax] w-[50vmax]" />
      <div className="ps-dots absolute inset-0" />
      <ChartLines />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(620px circle at var(--lx, 50%) var(--ly, 120%), rgb(var(--ps-hi) / 0.1), transparent 45%)" }}
      />
      <div className="ps-vignette absolute inset-0" />
    </div>
  );
}

/** Three demand/forecast curves across the lower third that redraw on a slow loop. */
function ChartLines() {
  const lines = [
    { d: "M0,300 C120,270 200,320 320,280 S520,210 640,240 S860,300 980,230 S1180,170 1300,200", hi: true, dur: "7s", delay: "0s" },
    { d: "M0,340 C140,330 240,290 360,310 S560,350 700,300 S900,260 1040,290 S1220,320 1300,300", hi: false, dur: "9s", delay: "1.2s" },
    { d: "M0,250 C160,240 260,200 400,220 S600,270 760,210 S960,150 1100,180 S1240,210 1300,160", hi: false, dur: "11s", delay: "2.4s" },
  ];
  return (
    <svg viewBox="0 0 1300 400" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[55%] w-full opacity-70">
      <defs>
        <linearGradient id="ps-line-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="20%" stopColor="white" stopOpacity="1" />
          <stop offset="85%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="ps-line-mask">
          <rect width="1300" height="400" fill="url(#ps-line-fade)" />
        </mask>
      </defs>
      {[100, 180, 260, 340].map((y) => (
        <line key={y} x1="0" x2="1300" y1={y} y2={y} stroke="rgb(var(--ps-fg))" strokeOpacity="0.05" strokeDasharray="2 8" />
      ))}
      <g mask="url(#ps-line-mask)">
        {lines.map((l, i) => (
          <path
            key={i}
            d={l.d}
            pathLength={1}
            fill="none"
            stroke={l.hi ? "rgb(var(--ps-hi))" : "rgb(var(--ps-fg))"}
            strokeOpacity={l.hi ? 0.55 : 0.16}
            strokeWidth={l.hi ? 2 : 1.2}
            strokeDasharray="1"
            strokeLinecap="round"
            style={{
              strokeDashoffset: 1,
              animation: `ps-line-draw ${l.dur} var(--ease-out) ${l.delay} infinite`,
              filter: l.hi ? "drop-shadow(0 0 6px rgb(var(--ps-hi) / 0.6))" : undefined,
            }}
          />
        ))}
      </g>
    </svg>
  );
}

/** Text wordmark used across the premium flow. */
export function PremiumWordmark() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="grid h-7 w-7 place-items-center rounded-lg ps-glass">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path d="M1.5 11.5 5 7l3 2.5 6.5-7" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "rgb(var(--ps-hi))" }} />
        </svg>
      </span>
      <span className="font-display text-[15px] font-semibold tracking-tight ps-fg">
        FTGM <span className="ps-fg-3 font-medium">Premium</span>
      </span>
    </div>
  );
}
