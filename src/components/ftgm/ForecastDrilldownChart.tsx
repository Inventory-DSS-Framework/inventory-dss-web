"use client";

import { useId, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
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
 * History + what comes next, drawn like the engine scene of the intro: the sales you made
 * as a filled curve, then the probable range as a soft band with the AI's own estimate as a
 * dashed line running down its middle. The dashed line leaves exactly where the solid one
 * ends, so the eye follows a single story; when there is nothing to project it breaks on
 * purpose, and its slope follows the recommendation (flat for a steady seller, rising for a
 * strong one).
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
  // Two of these charts can share a screen (normal + expert), so the gradients need own ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

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
      // Continuity: both the range and the dashed estimate open from the exact point where
      // the sales line ends…
      if (view !== "sin" && last) {
        last.band = [lastObserved, lastObserved];
        last.forecast = lastObserved;
      }
      // …except when there is nothing to project, where the break itself is the message.
      if (view === "sin" && last) rows.push({ name: `${last.name}~`, band: null, forecast: null });

      result.points.forEach((p, k) => {
        const half = spread[k] ?? Math.max(0.4, predicted[k] * 0.18);
        const centre =
          view === "sin"
            ? predicted[k]
            : view === "medio"
              ? mean
              : lastObserved + ((top - lastObserved) * (k + 1)) / predicted.length;
        rows.push({
          name: p.period_date,
          band: [Math.max(0, centre - half), centre + half],
          // La línea intermedia: lo que el motor espera que muevas, siempre dentro de la franja.
          forecast: Math.max(0, centre),
        });
      });
    }
    return { data: rows, outlook: view };
  }, [result, frequency, range]);

  const boundary = result.points[0]?.period_date;
  const lastName = data.length ? String(data[data.length - 1].name) : undefined;
  const meta = OUTLOOK_META[outlook];
  const clean = (v: unknown) => String(v).replace(/~$/, "");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {simple ? (
            <>
              <LegendChip color={c.primary} label="Lo que vendiste" />
              <LegendChip color={c.accent2} label="Lo que la IA espera" dashed />
              <LegendChip color={c.accent2} label="Rango probable" />
            </>
          ) : (
            <>
              <LegendChip color={c.primary} label="Demanda observada" />
              <LegendChip color={c.warning} label="Demanda reparada" />
              <LegendChip color={c.muted} label="Ajuste del modelo" dashed />
              <LegendChip color={c.accent2} label="Pronóstico" dashed />
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
          <ComposedChart data={data} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={`hist-${uid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={c.primary} stopOpacity={0.22} />
                <stop offset="100%" stopColor={c.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`band-${uid}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor={c.accent2} stopOpacity={0.38} />
                <stop offset="100%" stopColor={c.accent2} stopOpacity={0.12} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={c.grid} />
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
                      ? { observed: "Vendiste", forecast: "Esperamos", band: "Rango probable" }
                      : {
                          observed: "Observada",
                          cleaned: "Reparada / limpia",
                          fitted: "Ajuste",
                          forecast: "Pronóstico",
                          band: "Rango probable",
                          stockout: "Quiebre",
                          outlier: "Atípico",
                        }
                  }
                  labelFormat={(l) => periodLabel(clean(l), frequency)}
                />
              }
            />

            {/* Lo que viene queda sobre un fondo apenas teñido, como en la escena del motor. */}
            {boundary && lastName && (
              <ReferenceArea x1={boundary} x2={lastName} fill={c.accent2} fillOpacity={0.05} ifOverflow="extendDomain" />
            )}
            {boundary && (
              <ReferenceLine
                x={boundary}
                stroke={c.muted}
                strokeOpacity={0.45}
                strokeDasharray="3 4"
                label={{ value: "HOY", position: "insideTopLeft", fill: c.muted, fontSize: 10, letterSpacing: 1.4, dy: -10 }}
              />
            )}

            <Area
              type="natural"
              dataKey="band"
              stroke="none"
              fill={`url(#band-${uid})`}
              isAnimationActive={false}
              connectNulls={false}
            />
            {/* La línea intermedia: el valor que el motor espera, punteado para separarlo del pasado. */}
            <Line
              type="natural"
              dataKey="forecast"
              stroke={c.accent2}
              strokeWidth={2.4}
              strokeDasharray="6 5"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: c.accent2, stroke: c.surface, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Area
              type="natural"
              dataKey="observed"
              stroke={c.primary}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill={`url(#hist-${uid})`}
              dot={false}
              activeDot={{ r: 4, fill: c.primary, stroke: c.surface, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
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
