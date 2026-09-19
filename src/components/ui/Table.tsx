import { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface Column<T> {
  header: string;
  accessor: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  /** Optional title rendered in a header bar above the table. */
  title?: string;
  /** Optional element (e.g. button, filter) aligned to the right of the title. */
  action?: ReactNode;
  /** If provided, rows become clickable and this handler is called on click. */
  onRowClick?: (item: T) => void;
}

export function Table<T>({ columns, data, keyExtractor, title, action, onRowClick }: TableProps<T>) {
  return (
    <Card className="overflow-hidden p-0">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          {title && <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h3>}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-soft/60">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    "whitespace-nowrap px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={cn(
                  "transition-colors duration-150 hover:bg-primary-softer/60",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((col, j) => (
                  <td key={j} className={cn("px-6 py-3.5 text-sm text-text-primary", col.className)}>
                    {col.accessor(item)}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <Inbox className="h-6 w-6" />
                    <span className="text-sm">No hay datos disponibles</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const badgeVariants = {
  default: "bg-surface-muted text-text-secondary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  primary: "bg-primary-soft text-primary",
  violet: "bg-accent-violet-soft text-accent-violet",
} as const;

export function Badge({
  children,
  variant = "default",
  dot = false,
}: {
  children: ReactNode;
  variant?: keyof typeof badgeVariants;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "badge inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-semibold",
        badgeVariants[variant],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />}
      {children}
    </span>
  );
}
