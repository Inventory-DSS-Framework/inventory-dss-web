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
  /** Hex color of the progress arc. */
  color?: string;
  trackColor?: string;
}

export function CircularGauge({
  value,
  size = 132,
  strokeWidth = 12,
  label,
  caption,
  className,
  color = "#3358F4",
  trackColor = "#E5EAFE",
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-text-primary">{label ?? `${clamped}%`}</span>
        {caption && <span className="mt-0.5 text-[11px] font-medium text-text-muted">{caption}</span>}
      </div>
    </div>
  );
}
