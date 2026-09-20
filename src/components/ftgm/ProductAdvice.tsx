"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { ftgmApi } from "@/lib/apis/ftgm";
import { cn } from "@/lib/utils";
import { ACTIONS, decide } from "./decisions";

const TONE: Record<string, string> = {
  danger: "border-danger/30 bg-danger-soft/30",
  warning: "border-warning/30 bg-warning-soft/30",
  success: "border-success/25 bg-success-soft/25",
  violet: "border-accent-violet/25 bg-accent-violet-soft/20",
  primary: "border-primary/25 bg-primary-soft/25",
  default: "border-border bg-surface-soft/60",
};
const CHIP: Record<string, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  violet: "bg-accent-violet-soft text-accent-violet",
  primary: "bg-primary-soft text-primary",
  default: "bg-surface-muted text-text-secondary",
};

/**
 * "¿Qué hago con este producto?": the latest forecast that included the product, turned
 * into the same plain action the forecast result shows (one dictionary, one answer).
 */
export function ProductAdvice({ companyId, productId }: { companyId: string | null; productId: string }) {
  const advice = useApi(async () => {
    if (!companyId) return null;
    const entries = await ftgmApi.byProduct(companyId, productId, 1);
    const run = entries[0]?.run;
    if (!run || run.status !== "success") return { row: null, runId: null };
    const ov = await ftgmApi.overview(companyId, run.id);
    return { row: ov.products.find((p) => p.product_id === productId) ?? null, runId: run.id };
  }, [companyId, productId]);

  if (advice.loading && !advice.data) return null;
  const row = advice.data?.row;

  if (!row || row.status === "skipped") {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-accent-violet" />
          <div>
            <p className="font-display font-semibold text-text-primary">¿Qué hago con este producto?</p>
            <p className="text-sm text-text-secondary">
              Calcula cuánto venderás y te diremos si conviene comprar más, esperar o dejar de traerlo.
            </p>
          </div>
        </div>
        <Link href="/forecasting" className="btn btn-violet h-10 gap-2 px-4 text-sm">
          Calcular <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    );
  }

  const d = decide(row);
  const meta = ACTIONS[d.action];
  const Icon = meta.icon;
  const buy = d.action === "reponer_ya" || d.action === "reponer";
  return (
    <Card className={cn("space-y-3", TONE[meta.tone])}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("rounded-xl p-2.5", CHIP[meta.tone])}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted">¿Qué hago con este producto?</p>
            <p className="font-display text-lg font-semibold text-text-primary">{meta.title}</p>
            <p className="text-sm text-text-secondary">{d.sentence}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {buy && (
            <Link href="/purchases/new" className="btn btn-primary h-10 gap-1.5 px-4 text-sm">
              Registrar compra <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {advice.data?.runId && (
            <Link
              href={`/forecasting?run=${advice.data.runId}`}
              className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-text-secondary hover:bg-surface hover:text-text-primary"
            >
              Ver cálculo
            </Link>
          )}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Vendes {d.rate} · Confianza {d.confidence.toLowerCase()}
        {row.accuracy_pct != null && <> (acertó {Math.round(row.accuracy_pct)}% con tus ventas pasadas)</>}
      </p>
    </Card>
  );
}
