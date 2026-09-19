"use client";

import { useMemo } from "react";
import {
  Bar,
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
import { useBrandColors } from "@/hooks/useBrandColors";
import type { ProductInsight } from "@/types/ftgm";
import { ChartTooltip, LegendChip } from "./ChartTooltip";
import { periodLabel } from "./labels";

/**
 * Stock level over time (line) + units sold (bars) + restocks (markers) + stock-out
 * periods (shaded). Tells the story behind the demand the engine will see.
 */
export function ProductInsightChart({ insight, height = 280 }: { insight: ProductInsight; height?: number }) {
  const c = useBrandColors();
  const data = useMemo(
    () =>
      insight.periods.map((p) => ({
        name: p.period,
        units: p.units,
        lost: p.lost_units || null,
        stock: p.stock_end,
        restock: p.restock_units > 0 ? p.restock_units : null,
        restockMark: p.restock_units > 0 ? 0 : null,
        stockout: p.stockout_days > 0,
        stockoutDays: p.stockout_days,
      })),
    [insight],
  );
  const shaded = data.filter((d) => d.stockout);
  const hasStock = data.some((d) => d.stock != null);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <LegendChip color={c.accent} label="Unidades vendidas" />
        {hasStock && <LegendChip color={c.primary} label="Stock al cierre" />}
        <LegendChip color={c.success} label="Reabastecimiento" />
        <LegendChip color={c.danger} label="Periodo con quiebre" />
        {!hasStock && (
          <span className="text-[11px] text-text-muted">
            Stock histórico no disponible: el kardex no cubre estas ventas.
          </span>
        )}
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={c.grid} />
            {shaded.map((d) => (
              <ReferenceArea key={d.name} x1={d.name} x2={d.name} fill={c.danger} fillOpacity={0.1} strokeOpacity={0} ifOverflow="extendDomain" />
            ))}
            <XAxis
              dataKey="name"
              tickFormatter={(v) => periodLabel(v, insight.frequency)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: c.muted, fontSize: 11 }}
              minTickGap={18}
              dy={6}
            />
            <YAxis yAxisId="u" axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 11 }} width={44} />
            {hasStock && (
              <YAxis yAxisId="s" orientation="right" axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 11 }} width={40} />
            )}
            {hasStock && insight.safety_stock > 0 && (
              <ReferenceLine yAxisId="s" y={insight.safety_stock} stroke={c.warning} strokeDasharray="4 4" strokeOpacity={0.7} />
            )}
            <Tooltip
              cursor={{ fill: c.grid, fillOpacity: 0.35 }}
              content={
                <ChartTooltip
                  names={{ units: "Vendidas", lost: "Ventas perdidas", stock: "Stock al cierre", restock: "Reabastecido", stockoutDays: "Días en quiebre" }}
                  labelFormat={(l) => periodLabel(l, insight.frequency)}
                />
              }
            />
            <Bar yAxisId="u" dataKey="units" fill={c.accent} fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar yAxisId="u" dataKey="lost" stackId="lost" fill={c.danger} fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={18} />
            {hasStock && (
              <Line yAxisId="s" type="stepAfter" dataKey="stock" stroke={c.primary} strokeWidth={2} dot={false} connectNulls={false} />
            )}
            <Scatter yAxisId="u" dataKey="restockMark" fill={c.success} shape="triangle" />
            <Line yAxisId="u" dataKey="stockoutDays" stroke="transparent" dot={false} activeDot={false} legendType="none" />
            <Line yAxisId="u" dataKey="restock" stroke="transparent" dot={false} activeDot={false} legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
