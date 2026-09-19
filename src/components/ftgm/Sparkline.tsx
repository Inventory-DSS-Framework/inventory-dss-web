"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** Tiny dependency-free demand sparkline (SVG, colored with the current text color). */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  if (values.length < 2 || values.every((v) => v === 0)) {
    return (
      <svg width={width} height={height} className={cn("text-text-muted", className)} aria-hidden>
        <line x1="0" x2={width} y1={height - 2} y2={height - 2} stroke="currentColor" strokeDasharray="3 4" strokeOpacity={0.5} />
      </svg>
    );
  }
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className={cn("text-accent-violet", className)} aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill="currentColor" />
    </svg>
  );
}
