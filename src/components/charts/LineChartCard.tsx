"use client";

import { useId } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
import { useBrandColors } from "@/hooks/useBrandColors";
import { ChartDataPoint } from "@/types";

interface SeriesDef {
  dataKey: string;
  stroke: string;
  name: string;
  /** Optional headline value shown next to the legend chip. */
  value?: string;
  /** Fill the area under the line. Defaults to true. */
  fill?: boolean;
  /** Render the line dashed (e.g. confidence bounds). */
  dashed?: boolean;
}

interface LineChartCardProps {
  title: string;
  data: ChartDataPoint[];
  lines: SeriesDef[];
  className?: string;
  height?: number;
  /** Format Y axis / tooltip values. */
  valueFormatter?: (v: number) => string;
  /** Prefix for the tooltip label (defaults to "Día"). Pass "" to show the raw label. */
  labelPrefix?: string;
  /** Optional explanatory line under the title. */
  subtitle?: string;
}

function CustomTooltip({ active, payload, label, lines, valueFormatter, labelPrefix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass min-w-[170px] rounded-2xl px-4 py-3 shadow-soft-xl">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
        {[labelPrefix, label].filter(Boolean).join(" ")}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => {
          const def = lines.find((l: SeriesDef) => l.dataKey === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="h-2 w-2 rounded-full" style={{ background: entry.color, boxShadow: `0 0 8px ${entry.color}` }} />
                {def?.name ?? entry.name}
              </span>
              <span className="font-display text-xs font-semibold tabular-nums text-text-primary">
                {valueFormatter ? valueFormatter(entry.value) : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineChartCard({ title, data, lines, className, height = 260, valueFormatter, labelPrefix = "Día", subtitle }: LineChartCardProps) {
  const uid = useId().replace(/:/g, "");
  const colors = useBrandColors();

  return (
    <Card className={className}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-[-0.01em] text-text-primary">{title}</h3>
          {subtitle && <p className="mt-1 text-xs leading-relaxed text-text-secondary">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lines.map((line) => (
            <div key={line.dataKey} className="flex items-center gap-2 rounded-full border border-border-soft bg-surface-soft/70 px-2.5 py-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: line.stroke, boxShadow: `0 0 8px ${line.stroke}` }}
              />
              <span className="text-[11px] font-medium text-text-secondary">{line.name}</span>
              {line.value && <span className="text-[11px] font-semibold text-text-primary">{line.value}</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              {lines.map((line) => (
                <linearGradient key={line.dataKey} id={`${uid}-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.stroke} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={line.stroke} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={colors.grid} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: colors.muted, fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: colors.muted, fontSize: 11 }} width={48} />
            <Tooltip
              cursor={{ stroke: colors.muted, strokeOpacity: 0.4, strokeWidth: 1, strokeDasharray: "4 4" }}
              content={<CustomTooltip lines={lines} valueFormatter={valueFormatter} labelPrefix={labelPrefix} />}
            />
            {lines.map((line) => (
              <Area
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke}
                strokeWidth={line.dashed ? 1.5 : 2.5}
                strokeDasharray={line.dashed ? "5 4" : undefined}
                fill={line.fill === false ? "none" : `url(#${uid}-${line.dataKey})`}
                name={line.name}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface, fill: line.stroke }}
                animationDuration={900}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
