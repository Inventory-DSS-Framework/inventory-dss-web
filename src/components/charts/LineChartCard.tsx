"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
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
    <div className="rounded-2xl bg-surface border border-border shadow-soft-lg px-4 py-3 min-w-[150px]">
      <p className="text-[11px] font-medium text-text-muted mb-2">{[labelPrefix, label].filter(Boolean).join(" ")}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => {
          const def = lines.find((l: SeriesDef) => l.dataKey === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                {def?.name ?? entry.name}
              </span>
              <span className="text-xs font-semibold text-text-primary">
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
  return (
    <Card className={className}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {lines.map((line) => (
            <div key={line.dataKey} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: line.stroke }} />
              <span className="text-xs font-medium text-text-secondary">{line.name}</span>
              {line.value && <span className="text-xs font-semibold text-text-primary">{line.value}</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              {lines.map((line) => (
                <linearGradient key={line.dataKey} id={`fill-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.stroke} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={line.stroke} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#EFF2F8" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9AA1B9", fontSize: 11 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9AA1B9", fontSize: 11 }} width={48} />
            <Tooltip
              cursor={{ stroke: "#C9D2EA", strokeWidth: 1, strokeDasharray: "4 4" }}
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
                fill={line.fill === false ? "none" : `url(#fill-${line.dataKey})`}
                name={line.name}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: line.stroke }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
