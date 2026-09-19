"use client";

import { useMemo } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBrandColors } from "@/hooks/useBrandColors";
import type { ProductTracking } from "@/types/ftgm";
import { ChartTooltip, LegendChip } from "./ChartTooltip";
import { periodLabel } from "./labels";

/** "Lo que pronosticamos vs lo que pasó": forecast line + interval band vs actual sales. */
export function ForecastVsActualChart({ tracking, height = 240 }: { tracking: ProductTracking; height?: number }) {
  const c = useBrandColors();
  const data = useMemo(
    () =>
      tracking.rows.map((r) => ({
        name: r.period,
        forecast: r.forecast,
        band: r.lower != null && r.upper != null ? [r.lower, r.upper] : null,
        actual: r.actual != null && !r.partial ? r.actual : null,
        partial: r.actual != null && r.partial ? r.actual : null,
        expected: r.partial ? r.forecast_to_date : null,
      })),
    [tracking],
  );
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <LegendChip color={c.accent} label="Pronóstico" dashed />
        <LegendChip color={c.accent2} label="Intervalo 90%" />
        <LegendChip color={c.primary} label="Venta real" />
        <LegendChip color={c.muted} label="Periodo en curso" />
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={c.grid} />
            <XAxis
              dataKey="name"
              tickFormatter={(v) => periodLabel(v, tracking.frequency)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: c.muted, fontSize: 11 }}
              dy={6}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 11 }} width={44} />
            <Tooltip
              cursor={{ fill: c.grid, fillOpacity: 0.35 }}
              content={
                <ChartTooltip
                  names={{ forecast: "Pronóstico", band: "Intervalo", actual: "Venta real", partial: "Real a la fecha", expected: "Esperado a la fecha" }}
                  labelFormat={(l) => periodLabel(l, tracking.frequency)}
                />
              }
            />
            <Area dataKey="band" stroke="none" fill={c.accent2} fillOpacity={0.25} isAnimationActive={false} />
            <Bar dataKey="actual" fill={c.primary} fillOpacity={0.8} radius={[5, 5, 0, 0]} maxBarSize={28} />
            <Bar dataKey="partial" fill={c.muted} fillOpacity={0.45} radius={[5, 5, 0, 0]} maxBarSize={28} />
            <Line dataKey="forecast" stroke={c.accent} strokeWidth={2.2} strokeDasharray="6 4" dot={{ r: 3, fill: c.accent }} />
            <Line dataKey="expected" stroke="transparent" dot={{ r: 4, fill: c.surface, stroke: c.accent, strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
