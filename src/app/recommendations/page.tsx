"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckCircle, ShoppingCart, Sparkles, Lightbulb } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { productsApi, recommendationsApi } from "@/lib/api";
import type { RecommendationPriority } from "@/types/api";

const accentBar: Record<RecommendationPriority, string> = {
  high: "before:bg-danger",
  medium: "before:bg-warning",
  low: "before:bg-primary",
};
const priorityLabel: Record<RecommendationPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export default function RecommendationsPage() {
  const companyId = useCompanyId();
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const recs = useApi(
    () => (companyId ? recommendationsApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  const products = useApi(
    () => (companyId ? productsApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = recs.data ?? [];

  const productOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products.data]);

  const run = async (fn: () => Promise<unknown>) => {
    setWorking(true);
    setActionError(null);
    try {
      await fn();
      recs.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Operación fallida");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Inteligencia"
        title="Recomendaciones accionables"
        description="Sugerencias del DSS basadas en el cruce de pronósticos, stock y parámetros."
        action={
          <Button
            variant="secondary"
            disabled={working || !companyId}
            onClick={() => companyId && run(() => recommendationsApi.generate(companyId))}
          >
            <Sparkles className="w-4 h-4" />
            {working ? "Procesando…" : "Generar"}
          </Button>
        }
      />

      {actionError && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      <DataState
        loading={recs.loading}
        error={recs.error}
        empty={items.length === 0}
        onRetry={recs.reload}
        emptyState={
          <EmptyState
            icon={Lightbulb}
            title="Sin recomendaciones todavía"
            description="Las recomendaciones se generan del último pronóstico cruzado con tu stock y lead time. Se crean solas al ejecutar un pronóstico, o puedes generarlas con el botón «Generar»."
            action={{ label: "Ir a Pronóstico", href: "/forecasting" }}
          />
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((rec) => (
            <Card
              key={rec.id}
              className={`relative flex flex-col h-full overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${accentBar[rec.priority]}`}
            >
              <div className="flex justify-between items-start mb-4">
                <Badge variant={rec.priority === "high" ? "danger" : rec.priority === "medium" ? "warning" : "primary"} dot>
                  {priorityLabel[rec.priority]}
                </Badge>
                <span className="text-xs text-text-muted font-mono">{rec.id.slice(0, 8)}</span>
              </div>

              <h3 className="font-semibold text-text-primary leading-snug text-sm">
                {productOf(rec.product_id)?.name ?? `Producto ${rec.product_id.slice(0, 8)}`}
                {productOf(rec.product_id) && (
                  <span className="block font-mono text-[11px] font-normal text-text-muted mt-0.5">
                    {productOf(rec.product_id)!.sku}
                  </span>
                )}
              </h3>

              <div className="bg-surface-soft rounded-2xl p-3.5 my-4">
                <p className="text-sm text-text-secondary">{rec.reason}</p>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <ShoppingCart className="w-4 h-4 text-text-secondary" />
                  <span className="font-semibold text-sm">Sugerido: {rec.recommended_quantity} uds.</span>
                </div>
                <Badge variant={rec.status === "pending" ? "default" : rec.status === "accepted" ? "success" : "danger"}>
                  {rec.status}
                </Badge>
              </div>

              {rec.status === "pending" && (
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1" disabled={working} onClick={() => companyId && run(() => recommendationsApi.accept(companyId, rec.id))}>
                    <CheckCircle className="w-4 h-4" />
                    Aprobar
                  </Button>
                  <Button variant="secondary" className="flex-1" disabled={working} onClick={() => companyId && run(() => recommendationsApi.dismiss(companyId, rec.id))}>
                    Descartar
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </DataState>
    </div>
  );
}
