import { ReactNode } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Card } from "./Card";

interface DataStateProps {
  loading: boolean;
  error: string | null;
  /** When true (and not loading/error), render an empty-state message. */
  empty?: boolean;
  emptyMessage?: string;
  /** Rich guided empty state; takes precedence over emptyMessage when provided. */
  emptyState?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}

/** Shimmering placeholder shaped like a list, so loading never feels like a blank page. */
export function Skeleton() {
  return (
    <Card className="space-y-5 py-7" aria-busy="true" aria-label="Cargando">
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3 rounded-full" />
          <div className="skeleton h-3 w-1/5 rounded-full" />
        </div>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-11 rounded-xl" style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </Card>
  );
}

/** Wraps content with loading / error / empty fallbacks. */
export function DataState({
  loading,
  error,
  empty = false,
  emptyMessage = "No hay datos disponibles.",
  emptyState,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) return <Skeleton />;

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger">
          <AlertCircle className="h-6 w-6" />
        </div>
        <p className="max-w-md text-sm text-text-secondary">{error}</p>
        {onRetry && (
          <button className="btn btn-secondary mt-1 h-9 gap-2 px-4 text-sm" onClick={onRetry}>
            <RotateCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        )}
      </Card>
    );
  }

  if (empty) {
    if (emptyState) return <>{emptyState}</>;
    return <Card className="flex items-center justify-center py-14 text-sm text-text-secondary">{emptyMessage}</Card>;
  }

  return <>{children}</>;
}
