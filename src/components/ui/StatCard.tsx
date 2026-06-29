import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { Card } from "./Card";

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
  /** On hover, a theme-colored particle travels around the card's border. */
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
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card interactive particle={particle} className={cn("flex flex-col justify-between gap-5", className)}>
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl shrink-0", accentStyles[accent])}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          {prefix && <span className="text-lg font-semibold text-text-secondary">{prefix}</span>}
          <span className="font-display text-[28px] leading-none font-bold tracking-tight text-text-primary tabular-nums">{value}</span>
          {suffix && <span className="text-lg font-semibold text-text-secondary">{suffix}</span>}
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-3">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                isPositive ? "bg-success-soft text-success" : isNegative ? "bg-danger-soft text-danger" : "bg-surface-muted text-text-secondary"
              )}
            >
              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : isNegative ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-text-muted">{changeLabel}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
