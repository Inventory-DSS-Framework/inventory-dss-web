import { cn } from "@/lib/utils";
import type { OrderStatus, SalesDocumentType } from "@/types/pos";

const DOC = {
  boleta: { label: "Boleta", cls: "bg-primary-soft text-primary" },
  factura: { label: "Factura", cls: "bg-accent-violet-soft text-accent-violet" },
  nota_venta: { label: "Nota de venta", cls: "bg-surface-muted text-text-secondary" },
} as const;

/** Comprobante type + number, e.g. [Boleta] B001-00000012. */
export function DocumentBadge({
  type,
  number,
  className,
}: {
  type: SalesDocumentType;
  number?: string;
  className?: string;
}) {
  const d = DOC[type];
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide", d.cls)}>{d.label}</span>
      {number && <span className="font-mono text-xs text-text-secondary">{number}</span>}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return status === "voided" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> Anulada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> Completada
    </span>
  );
}
