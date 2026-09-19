"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { useExperience } from "@/components/experience/ExperienceProvider";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  prefix?: string;
  suffix?: string;
  icon?: LucideIcon;
  /** Visual accent for the icon chip. */
  accent?: "primary" | "violet" | "success" | "warning" | "danger";
  /** Caption shown next to the change indicator. */
  changeLabel?: string;
  /** Premium only: a brand particle travels around the border on hover. */
  particle?: boolean;
  className?: string;
}

const accentStyles: Record<string, string> = {
  primary: "bg-primary-soft text-primary",
  violet: "bg-accent-violet-soft text-accent-violet",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/** Counts plain numeric strings ("42", "12.5") up from zero; anything else renders as-is. */
function useCountUp(value: string, enabled: boolean) {
  const match = /^-?\d+(?:\.(\d+))?$/.exec(value.trim());
  const decimals = match?.[1]?.length ?? 0;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!enabled || !match) {
      setDisplay(value);
      return;
    }
    const target = Number(value);
    const start = performance.now();
    const duration = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay((target * eased).toFixed(decimals));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled]);

  return display;
}

export function StatCard({
  title,
  value,
  change,
  prefix,
  suffix,
  icon: Icon,
  accent = "primary",
  changeLabel = "vs mes anterior",
  particle,
  className,
}: StatCardProps) {
  const { effects } = useExperience();
  const shown = useCountUp(value, effects);
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card interactive particle={particle} className={cn("group flex flex-col justify-between gap-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-medium leading-snug text-text-secondary">{title}</h3>
        {Icon && (
          <div className={cn("shrink-0 rounded-xl p-2.5 transition-transform duration-300 group-hover:scale-110", accentStyles[accent])}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          {prefix && <span className="text-lg font-medium text-text-muted">{prefix}</span>}
          <span className="font-display text-[32px] font-semibold leading-none tracking-[-0.035em] text-text-primary tabular-nums">
            {shown}
          </span>
          {suffix && <span className="text-lg font-medium text-text-muted">{suffix}</span>}
        </div>

        {change !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={cn(
                "badge inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                isPositive ? "bg-success-soft text-success" : isNegative ? "bg-danger-soft text-danger" : "bg-surface-muted text-text-secondary",
              )}
            >
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : isNegative ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-text-muted">{changeLabel}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
