"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CircularGaugeProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Main label inside the ring. Defaults to `value%`. */
  label?: string;
  caption?: string;
  className?: string;
  /** Arc color. Defaults to the live brand primary. */
  color?: string;
  /** Track color. Defaults to the live muted surface. */
  trackColor?: string;
}

export function CircularGauge({
  value,
  size = 132,
  strokeWidth = 10,
  label,
  caption,
  className,
  color = "rgb(var(--c-primary))",
  trackColor = "rgb(var(--c-surface-muted))",
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  // Start empty and sweep to the value once mounted.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(raf);
  }, [clamped]);
  const offset = circumference - (shown / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" style={{ stroke: trackColor }} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            stroke: color,
            filter: `drop-shadow(0 0 6px rgb(var(--c-glow) / 0.35))`,
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[26px] font-semibold tracking-[-0.03em] text-text-primary tabular-nums">
          {label ?? `${clamped}%`}
        </span>
        {caption && <span className="mt-0.5 text-[11px] font-medium text-text-muted">{caption}</span>}
      </div>
    </div>
  );
}
