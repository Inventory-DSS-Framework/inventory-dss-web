import { cn } from "@/lib/utils";

export type StockTone = "out" | "low" | "ok";

export function stockTone(stock: number, reorderPoint = 0): StockTone {
  if (stock <= 0) return "out";
  if (stock <= Math.max(reorderPoint, 5)) return "low";
  return "ok";
}

const TONE = {
  out: { cls: "bg-danger-soft text-danger", label: "Sin stock" },
  low: { cls: "bg-warning-soft text-warning", label: "Stock bajo" },
  ok: { cls: "bg-success-soft text-success", label: "Disponible" },
} as const;

/** "12 uds · Disponible" pill colored by stock status. */
export function StockBadge({
  stock,
  reorderPoint = 0,
  compact,
  className,
}: {
  stock: number;
  reorderPoint?: number;
  compact?: boolean;
  className?: string;
}) {
  const tone = TONE[stockTone(stock, reorderPoint)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
        tone.cls,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {stock <= 0 ? tone.label : compact ? `${stock} uds` : `${stock} uds · ${tone.label}`}
    </span>
  );
}
