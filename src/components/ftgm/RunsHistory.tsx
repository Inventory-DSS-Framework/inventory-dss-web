"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import type { FtgmRun } from "@/types/ftgm";
import { dateLabel, frequencyLabel, horizonLabel, num, runStatusMeta } from "./labels";

/** Runs list with scope, status and summary. */
export function RunsHistory({ runs }: { runs: FtgmRun[] }) {
  if (runs.length === 0) {
    return (
      <Card className="flex items-center gap-3 py-8 text-sm text-text-secondary">
        <Clock className="h-5 w-5 text-text-muted" /> Aún no hay ejecuciones del motor FTGM.
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="font-display text-[15px] font-semibold text-text-primary">Cálculos anteriores</h3>
        <span className="text-xs text-text-muted">{runs.length} ejecución(es)</span>
      </div>
      <div className="divide-y divide-border-soft">
        {runs.map((r) => {
          const s = runStatusMeta[r.status] ?? runStatusMeta.pending;
          const sum = r.summary;
          return (
            <Link
              key={r.id}
              href={`/forecasting/${r.id}`}
              className="group grid grid-cols-1 items-center gap-2 px-6 py-4 transition-colors hover:bg-accent-violet-soft/15 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.6fr)_120px_20px] md:gap-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {r.scope_description ?? "Ejecución del motor"}
                </p>
                <p className="text-xs text-text-muted">
                  {dateLabel(r.created_at ?? r.started_at)} · {r.product_count} producto(s)
                </p>
              </div>
              <p className="text-xs text-text-secondary">
                Horizonte {horizonLabel(r.horizon_days)}
                {r.frequency && <> · {frequencyLabel[r.frequency] ?? r.frequency}</>}
              </p>
              <p className="text-xs text-text-secondary">
                {sum ? (
                  <>
                    <span className="font-semibold text-text-primary">{num(sum.total_forecast_units)} u</span> proyectadas ·{" "}
                    {sum.products_ok} FTGM · {sum.products_fallback} baseline
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
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
