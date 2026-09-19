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
import { useBrandColors } from "@/hooks/useBrandColors";
import { cn } from "@/lib/utils";
import type { ForecastResultDTO } from "@/types/api";
import { ChartTooltip, LegendChip } from "./ChartTooltip";
import { periodLabel } from "./labels";

/** History (observed / cleaned / fitted) + forecast with its interval band + stock-out markers.
 * With `simple`, only past sales + forecast + probable range, in plain words. */
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

  const data = useMemo(() => {
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
    const last = rows[rows.length - 1];
    if (last && result.points.length) last.forecast = last.fitted ?? last.observed;
    for (const p of result.points) {
      rows.push({
        name: p.period_date,
        forecast: Number(p.predicted_demand),
        band: p.lower_bound != null && p.upper_bound != null ? [Number(p.lower_bound), Number(p.upper_bound)] : null,
      });
    }
    return rows;
  }, [result, frequency, range]);

  const boundary = result.points[0]?.period_date;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {simple ? (
            <>
              <LegendChip color={c.primary} label="Lo que vendiste" />
              <LegendChip color={c.accent} label="Lo que venderías" />
              <LegendChip color={c.accent2} label="Rango probable" />
            </>
          ) : (
            <>
              <LegendChip color={c.primary} label="Demanda observada" />
              <LegendChip color={c.warning} label="Demanda reparada" />
              <LegendChip color={c.muted} label="Ajuste del modelo" dashed />
              <LegendChip color={c.accent} label="Pronóstico" />
              <LegendChip color={c.accent2} label="Intervalo 90%" />
              <LegendChip color={c.danger} label="Quiebre" />
            </>
          )}
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
              tickFormatter={(v) => periodLabel(v, frequency)}
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
                      ? { observed: "Vendiste", forecast: "Venderías", band: "Rango probable" }
                      : {
                          observed: "Observada",
                          cleaned: "Reparada / limpia",
                          fitted: "Ajuste",
                          forecast: "Pronóstico",
                          band: "Intervalo",
                          stockout: "Quiebre",
                          outlier: "Atípico",
                        }
                  }
                  labelFormat={(l) => periodLabel(l, frequency)}
                />
              }
            />
            {boundary && <ReferenceLine x={boundary} stroke={c.accent} strokeOpacity={0.35} strokeDasharray="3 3" />}
            <Area dataKey="band" stroke="none" fill={c.accent2} fillOpacity={0.28} isAnimationActive={false} />
            <Area type="monotone" dataKey="observed" stroke={c.primary} strokeWidth={2} fill={c.primary} fillOpacity={0.07} dot={false} />
            {!simple && <Line type="monotone" dataKey="cleaned" stroke={c.warning} strokeWidth={0} dot={{ r: 3.5, fill: c.warning }} />}
            {!simple && <Line type="monotone" dataKey="fitted" stroke={c.muted} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />}
            <Line type="monotone" dataKey="forecast" stroke={c.accent} strokeWidth={2.6} strokeDasharray={simple ? "6 4" : undefined} dot={{ r: 3, fill: c.accent }} />
            {!simple && <Scatter dataKey="stockout" fill={c.danger} />}
            {!simple && <Scatter dataKey="outlier" fill={c.warning} shape="diamond" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
