"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { useBrandColors } from "@/hooks/useBrandColors";
import { cn } from "@/lib/utils";
import type { ForecastResultDTO } from "@/types/api";
import { ChartTooltip, LegendChip } from "./ChartTooltip";
import { periodLabel } from "./labels";

/**
 * How the product reads at a glance. The chart tells the same story as the advice:
 * nothing to project (broken line), steady (flat range) or growing (rising range).
 */
export type Outlook = "sin" | "medio" | "bueno";

export const OUTLOOK_META: Record<Outlook, { label: string; icon: typeof CheckCircle2; chip: string }> = {
  sin: { label: "No recomendar reponer", icon: XCircle, chip: "bg-surface-muted text-text-secondary" },
  medio: { label: "Recomendar a medias", icon: MinusCircle, chip: "bg-warning-soft text-warning" },
  bueno: { label: "Recomendar", icon: CheckCircle2, chip: "bg-success-soft text-success" },
};

/** No sales at all → "sin"; sells little → "medio"; sells well → "bueno". */
function outlookOf(history: number[], forecast: number[]): Outlook {
  const sold = history.reduce((a, b) => a + b, 0);
  const total = forecast.reduce((a, b) => a + b, 0);
  if (sold < 1 || total < 1) return "sin";
  return total / Math.max(1, forecast.length) >= 3 ? "bueno" : "medio";
}

/**
 * History (observed / cleaned / fitted) + the probable range of what comes next.
 * The projected line itself is not drawn: the shaded range carries the future, and its
 * shape follows the recommendation — broken when there is nothing to project, flat for a
 * steady seller, rising for a strong one.
 */
export function ForecastDrilldownChart({
  result,
  frequency,
  height = 320,
  simple = false,
}: {
  result: ForecastResultDTO;
  frequency: string;
  height?: number;
  simple?: boolean;
}) {
  const c = useBrandColors();
  const [range, setRange] = useState<"recent" | "all">("recent");

  const { data, outlook } = useMemo(() => {
    const window = frequency === "weekly" ? 52 : 36;
    const hist = range === "all" ? result.history : result.history.slice(-window);
    const rows: Record<string, unknown>[] = hist.map((h) => ({
      name: h.period_date,
      observed: Number(h.observed),
      cleaned: Number(h.cleaned) !== Number(h.observed) ? Number(h.cleaned) : null,
      fitted: h.fitted != null ? Number(h.fitted) : null,
      stockout: h.is_stockout ? Number(h.observed) : null,
      outlier: (h as { is_outlier?: boolean }).is_outlier ? Number(h.observed) : null,
    }));

    const predicted = result.points.map((p) => Number(p.predicted_demand));
    const spread = result.points.map((p) =>
      p.lower_bound != null && p.upper_bound != null ? (Number(p.upper_bound) - Number(p.lower_bound)) / 2 : null,
    );
    const view = outlookOf(
      result.history.map((h) => Number(h.observed)),
      predicted,
    );

    const last = rows[rows.length - 1];
    const lastObserved = last ? Number(last.observed) : 0;

    if (predicted.length) {
      const mean = predicted.reduce((a, b) => a + b, 0) / predicted.length;
      const top = Math.max(...predicted, lastObserved * 1.15);
      // Continuity: the range opens from the exact point where the sales line ends…
      if (view !== "sin" && last) last.band = [lastObserved, lastObserved];
      // …except when there is nothing to project, where the break itself is the message.
      if (view === "sin" && last) rows.push({ name: `${last.name}~`, band: null });

      result.points.forEach((p, k) => {
        const half = spread[k] ?? Math.max(0.4, predicted[k] * 0.18);
        const centre =
          view === "sin"
            ? predicted[k]
            : view === "medio"
              ? mean
              : lastObserved + ((top - lastObserved) * (k + 1)) / predicted.length;
        rows.push({ name: p.period_date, band: [Math.max(0, centre - half), centre + half] });
      });
    }
    return { data: rows, outlook: view };
  }, [result, frequency, range]);

  const boundary = result.points[0]?.period_date;
  const meta = OUTLOOK_META[outlook];
  const clean = (v: unknown) => String(v).replace(/~$/, "");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {simple ? (
            <>
              <LegendChip color={c.primary} label="Lo que vendiste" />
              <LegendChip color={c.accent2} label="Rango probable" />
            </>
          ) : (
            <>
              <LegendChip color={c.primary} label="Demanda observada" />
              <LegendChip color={c.warning} label="Demanda reparada" />
              <LegendChip color={c.muted} label="Ajuste del modelo" dashed />
              <LegendChip color={c.accent2} label="Rango probable" />
              <LegendChip color={c.danger} label="Quiebre" />
            </>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", meta.chip)}>
            <meta.icon className="h-3.5 w-3.5" /> {meta.label}
          </span>
        </div>
        <div className="flex rounded-xl border border-border bg-surface-soft p-0.5 text-xs">
          {(["recent", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                range === r ? "bg-surface text-text-primary shadow-soft" : "text-text-muted hover:text-text-primary",
              )}
            >
              {r === "recent" ? "Reciente" : "Toda la historia"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={c.grid} />
            <XAxis
              dataKey="name"
              tickFormatter={(v) => periodLabel(clean(v), frequency)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: c.muted, fontSize: 11 }}
              minTickGap={20}
              dy={6}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 11 }} width={48} />
            <Tooltip
              content={
                <ChartTooltip
                  names={
                    simple
                      ? { observed: "Vendiste", band: "Rango probable" }
                      : {
                          observed: "Observada",
                          cleaned: "Reparada / limpia",
                          fitted: "Ajuste",
                          band: "Rango probable",
                          stockout: "Quiebre",
                          outlier: "Atípico",
                        }
                  }
                  labelFormat={(l) => periodLabel(clean(l), frequency)}
                />
              }
            />
            {boundary && <ReferenceLine x={boundary} stroke={c.accent} strokeOpacity={0.35} strokeDasharray="3 3" />}
            <Area type="natural" dataKey="band" stroke="none" fill={c.accent2} fillOpacity={0.3} isAnimationActive={false} connectNulls={false} />
            <Area type="natural" dataKey="observed" stroke={c.primary} strokeWidth={2} fill={c.primary} fillOpacity={0.07} dot={false} connectNulls={false} />
            {!simple && <Line type="natural" dataKey="cleaned" stroke={c.warning} strokeWidth={0} dot={{ r: 3.5, fill: c.warning }} />}
            {!simple && <Line type="natural" dataKey="fitted" stroke={c.muted} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />}
            {!simple && <Scatter dataKey="stockout" fill={c.danger} />}
            {!simple && <Scatter dataKey="outlier" fill={c.warning} shape="diamond" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
