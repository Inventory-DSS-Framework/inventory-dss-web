import { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
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
  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-3 py-16 text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Cargando…
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="w-8 h-8 text-danger" />
        <p className="text-sm text-text-secondary max-w-md">{error}</p>
        {onRetry && (
          <button className="btn btn-secondary px-4 py-2 text-sm" onClick={onRetry}>
            Reintentar
          </button>
        )}
      </Card>
    );
  }

  if (empty) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <Card className="flex items-center justify-center py-16 text-text-secondary">
        {emptyMessage}
      </Card>
    );
  }

  return <>{children}</>;
}
