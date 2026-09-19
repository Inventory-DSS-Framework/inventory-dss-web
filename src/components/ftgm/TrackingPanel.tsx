"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { RunTracking } from "@/types/ftgm";
import { ForecastVsActualChart } from "./ForecastVsActualChart";
import { dateLabel, pct, trackingMeta, units } from "./labels";

/** "Seguimiento" tab: forecast vs actual for every product of a run. */
export function TrackingPanel({ tracking }: { tracking: RunTracking }) {
  const [selected, setSelected] = useState(tracking.products[0]?.product_id ?? null);
  const current = tracking.products.find((p) => p.product_id === selected);
  const pending = tracking.products.every((p) => p.status === "pendiente");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pronosticado a la fecha" value={units(tracking.forecast_to_date)} />
        <Stat label="Vendido a la fecha" value={units(tracking.actual_to_date)} />
        <Stat label="Sesgo global" value={pct(tracking.bias_pct)} hint="+ = pronóstico por encima" />
        <Stat
          label="Productos en línea"
          value={`${tracking.products_on_track} / ${tracking.products.length}`}
          hint={`${tracking.products_over} sobre · ${tracking.products_under} bajo`}
        />
      </div>

      {pending && (
        <Card className="flex items-start gap-3 border-accent-violet/25 bg-accent-violet-soft/20">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-accent-violet" />
          <p className="text-sm text-text-secondary">
            El horizonte de esta ejecución empieza después del {dateLabel(tracking.as_of)}. El seguimiento se llena solo a
            medida que registras ventas: cada periodo compara lo pronosticado con lo vendido (el periodo en curso se prorratea).
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="max-h-[460px] overflow-y-auto p-2">
          {tracking.products.map((p) => {
            const m = trackingMeta[p.status];
            return (
              <button
                key={p.product_id}
                onClick={() => setSelected(p.product_id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                  selected === p.product_id ? "bg-accent-violet-soft/50" : "hover:bg-surface-soft",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text-primary">{p.name}</span>
                  <span className="text-[11px] text-text-muted">MAPE {pct(p.mape)} · sesgo {pct(p.bias_pct)}</span>
                </span>
                <Badge variant={m.tone}>{m.label}</Badge>
              </button>
            );
          })}
        </Card>
        {current && (
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-text-primary">{current.name}</h3>
                <p className="text-xs text-text-muted">
                  {current.periods_complete} periodo(s) completos · {current.periods_elapsed} con datos de {current.periods_total}
                  {current.within_band_share != null && <> · {Math.round(current.within_band_share * 100)}% dentro del intervalo</>}
                </p>
              </div>
              <Badge variant={trackingMeta[current.status].tone} dot>
                {trackingMeta[current.status].label}
              </Badge>
            </div>
            <ForecastVsActualChart tracking={current} height={280} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Periodo</th>
                    <th className="py-2 pr-3 font-semibold">Pronóstico</th>
                    <th className="py-2 pr-3 font-semibold">Intervalo</th>
                    <th className="py-2 pr-3 font-semibold">Real</th>
                    <th className="py-2 font-semibold">Acumulado (pron. / real)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {current.rows.map((r) => (
                    <tr key={r.period}>
                      <td className="py-2 pr-3 text-text-primary">
                        {dateLabel(r.period)}
                        {r.partial && <span className="ml-1.5 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-text-muted">en curso</span>}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{units(r.forecast, 1)}</td>
                      <td className="py-2 pr-3 tabular-nums text-text-muted">
                        {r.lower != null ? `${r.lower.toFixed(0)} – ${r.upper?.toFixed(0)}` : "—"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{r.actual != null ? units(r.actual) : "—"}</td>
                      <td className="py-2 tabular-nums text-text-secondary">
                        {r.cum_forecast != null ? `${r.cum_forecast.toFixed(0)} / ${r.cum_actual?.toFixed(0)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-text-primary tabular-nums">{value}</p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
