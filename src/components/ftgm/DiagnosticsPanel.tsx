"use client";

import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductDiagnostics } from "@/types/ftgm";
import { frequencyLabel, modelLabel, num, pct } from "./labels";

/** Engine decisions explained in plain Spanish + the evidence behind them. */
export function DiagnosticsPanel({ diag, orderSelected }: { diag: ProductDiagnostics | undefined; orderSelected: number }) {
  if (!diag) return <p className="text-sm text-text-muted">Esta ejecución no guardó diagnósticos.</p>;
  const scores = Object.entries(diag.order_scores ?? {});
  const finite = scores.map(([, v]) => v).filter((v): v is number => v != null);
  const maxScore = finite.length ? Math.max(...finite) : 1;
  const strength = diag.seasonality_strength;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-2.5">
        {(diag.explanations ?? []).map((e, i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-border-soft bg-surface-soft/60 px-4 py-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-violet" />
            <p className="text-sm leading-relaxed text-text-secondary">{e}</p>
          </div>
        ))}
        {(diag.warnings ?? []).map((w, i) => (
          <p key={`w${i}`} className="rounded-2xl border border-warning/25 bg-warning-soft/50 px-4 py-2.5 text-xs text-warning">
            {w}
          </p>
        ))}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Evidence label="Frecuencia" value={frequencyLabel[diag.frequency ?? ""] ?? "—"} />
          <Evidence label="Periodos usados" value={num(diag.n_periods)} />
          <Evidence label="Quiebres reparados" value={`${diag.imputed_periods ?? 0} / ${diag.stockout_periods ?? 0}`} />
          <Evidence label="Atípicos suavizados" value={num(diag.outliers_cleaned)} />
          <Evidence label="Periodos sin venta" value={diag.zero_share != null ? pct(diag.zero_share * 100, 0) : "—"} />
          <Evidence label="Tendencia" value={diag.trend_pct_per_period != null ? `${diag.trend_pct_per_period > 0 ? "+" : ""}${diag.trend_pct_per_period.toFixed(1)}% / per.` : "—"} />
        </div>

        <div className="rounded-2xl border border-border-soft p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-text-secondary">Fuerza estacional</span>
            <span className="font-semibold text-text-primary">{strength != null ? strength.toFixed(2) : "—"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-accent-violet transition-all" style={{ width: `${Math.round((strength ?? 0) * 100)}%` }} />
          </div>
        </div>

        {diag.holdout && (
          <div className="rounded-2xl border border-border-soft p-4">
            <p className="mb-2 text-xs font-medium text-text-secondary">
              Validación fuera de muestra · {diag.holdout.origins} orígenes, {diag.holdout.horizon} periodos
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Evidence label="MAPE" value={pct(diag.holdout.mape)} />
              <Evidence label="MASE" value={diag.holdout.mase != null ? diag.holdout.mase.toFixed(2) : "—"} />
              <Evidence
                label="vs baseline"
                value={diag.skill_vs_naive != null ? `${diag.skill_vs_naive >= 0 ? "+" : ""}${(diag.skill_vs_naive * 100).toFixed(0)}%` : "—"}
              />
            </div>
          </div>
        )}

        {(diag.candidates?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-border-soft p-4">
            <p className="mb-3 text-xs font-medium text-text-secondary">
              Competencia de modelos · precisión sobre el total, mismos cortes del pasado
            </p>
            <div className="space-y-1.5">
              {diag.candidates!.map((c) => (
                <div key={c.model} className="flex items-center gap-2 text-xs">
                  <span className={cn("w-36 truncate", c.chosen ? "font-bold text-accent-violet" : "text-text-muted")}>
                    {c.chosen ? "✓ " : ""}
                    {modelLabel[c.model] ?? c.model}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className={cn("h-full rounded-full", c.chosen ? "bg-accent-violet" : "bg-border")}
                      style={{ width: `${Math.max(2, Math.round(c.accuracy_pct ?? 0))}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-text-secondary">
                    {c.accuracy_pct != null ? `${Math.round(c.accuracy_pct)}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {scores.length > 0 && (
          <div className="rounded-2xl border border-border-soft p-4">
            <p className="mb-3 text-xs font-medium text-text-secondary">
              Algoritmo 1 · RMSE de validación por orden de Fourier (tope {diag.max_order_allowed ?? "—"})
            </p>
            <div className="space-y-1.5">
              {scores.map(([order, v]) => (
                <div key={order} className="flex items-center gap-2 text-xs">
                  <span className={cn("w-8 font-mono", Number(order) === orderSelected ? "font-bold text-accent-violet" : "text-text-muted")}>
                    N={order}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    {v != null && (
                      <div
                        className={cn("h-full rounded-full", Number(order) === orderSelected ? "bg-accent-violet" : "bg-text-muted/40")}
                        style={{ width: `${Math.max(4, (v / maxScore) * 100)}%` }}
                      />
                    )}
                  </div>
                  <span className="w-14 text-right tabular-nums text-text-secondary">{v != null ? v.toFixed(1) : "inestable"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-soft px-3 py-2">
      <p className="text-[10.5px] text-text-muted">{label}</p>
      <p className="font-display text-sm font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}
