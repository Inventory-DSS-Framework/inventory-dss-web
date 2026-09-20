"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Clock, History } from "lucide-react";
import { Badge } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useExpertMode } from "@/hooks/useExpertMode";
import type { FtgmRun } from "@/types/ftgm";
import { dateLabel, forWhen, frequencyLabel, horizonLabel, num, runStatusMeta } from "./labels";

/**
 * Runs list with scope, status and summary. On /forecasting it opens the run in place
 * (`onSelect`); anywhere else it links to the same page with the run already chosen.
 */
export function RunsHistory({
  runs,
  onSelect,
  limit,
  title = "Cálculos anteriores",
  subtitle,
  className,
}: {
  runs: FtgmRun[];
  onSelect?: (runId: string) => void;
  /** Show only the most recent ones, with the rest one click away. */
  limit?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const [expert] = useExpertMode();
  const [all, setAll] = useState(false);
  if (runs.length === 0) {
    return (
      <Card className={cn("flex items-center gap-3 py-8 text-sm text-text-secondary", className)}>
        <Clock className="h-5 w-5 text-text-muted" /> Aún no calculaste cuánto venderás. Usa el botón de arriba.
      </Card>
    );
  }
  const hidden = limit && !all ? Math.max(0, runs.length - limit) : 0;
  const shown = hidden ? runs.slice(0, limit) : runs;
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-text-primary">
            <History className="h-4 w-4 text-accent-violet" /> {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text-secondary">
          {runs.length} {runs.length === 1 ? "cálculo" : "cálculos"}
        </span>
      </div>
      <div className="divide-y divide-border-soft">
        {shown.map((r) => {
          const s = runStatusMeta[r.status] ?? runStatusMeta.pending;
          const sum = r.summary;
          return (
            <RowShell
              key={r.id}
              runId={r.id}
              onSelect={onSelect}
              className="group grid grid-cols-1 items-center gap-2 px-6 py-4 transition-colors hover:bg-accent-violet-soft/15 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.6fr)_120px_20px] md:gap-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {r.scope_description ?? "Cálculo"}
                </p>
                <p className="text-xs text-text-muted">
                  {dateLabel(r.created_at ?? r.started_at)} · {r.product_count} {r.product_count === 1 ? "producto" : "productos"}
                </p>
              </div>
              <p className="text-xs text-text-secondary">
                {expert ? (
                  <>
                    Horizonte {horizonLabel(r.horizon_days)}
                    {r.frequency && <> · {frequencyLabel[r.frequency] ?? r.frequency}</>}
                  </>
                ) : (
                  <>{forWhen(r.horizon_days).replace(/^p/, "P")}</>
                )}
              </p>
              <p className="text-xs text-text-secondary">
                {sum ? (
                  <>
                    Venderías <span className="font-semibold text-text-primary">{num(sum.total_forecast_units)} unidades</span>
                    {expert ? (
                      <> · {sum.products_ok} FTGM · {sum.products_fallback} otros modelos</>
                    ) : sum.median_accuracy_pct != null ? (
                      <> · acierta ~{Math.round(sum.median_accuracy_pct)}%</>
                    ) : null}
                  </>
                ) : r.status === "failed" ? (
                  <span className="text-danger">{r.error_message?.slice(0, 80)}</span>
                ) : (
                  "—"
                )}
              </p>
              <Badge variant={s.tone} dot>
                {s.label}
              </Badge>
              <ArrowRight className="hidden h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5 md:block" />
            </RowShell>
          );
        })}
      </div>
      {(hidden > 0 || all) && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border-soft py-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-soft hover:text-text-primary"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", all && "rotate-180")} />
          {all ? "Ver solo los últimos" : `Ver ${hidden} más`}
        </button>
      )}
    </Card>
  );
}

function RowShell({
  runId,
  onSelect,
  className,
  children,
}: {
  runId: string;
  onSelect?: (runId: string) => void;
  className: string;
  children: React.ReactNode;
}) {
  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(runId)} className={cn(className, "w-full text-left")}>
        {children}
      </button>
    );
  }
  return (
    <Link href={`/forecasting?run=${runId}`} className={className}>
      {children}
    </Link>
  );
}
