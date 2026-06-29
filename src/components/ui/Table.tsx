import { ReactNode } from "react";
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
    <Card className="p-0 overflow-hidden">
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          {title && <h3 className="font-display text-base font-semibold text-text-primary">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-6 py-3.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap",
                    col.className
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
                  "hover:bg-surface-soft/70 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col, j) => (
                  <td key={j} className={cn("px-6 py-4 text-sm text-text-primary", col.className)}>
                    {col.accessor(item)}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-text-secondary">
                  No hay datos disponibles
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
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
        badgeVariants[variant]
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
