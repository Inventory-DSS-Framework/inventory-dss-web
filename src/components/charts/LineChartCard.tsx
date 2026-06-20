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
}

interface LineChartCardProps {
  title: string;
  data: ChartDataPoint[];
  lines: SeriesDef[];
  className?: string;
  height?: number;
  /** Format Y axis / tooltip values. */
  valueFormatter?: (v: number) => string;
}

function CustomTooltip({ active, payload, label, lines, valueFormatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl bg-surface border border-border shadow-soft-lg px-4 py-3 min-w-[150px]">
      <p className="text-[11px] font-medium text-text-muted mb-2">Día {label}</p>
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

export function LineChartCard({ title, data, lines, className, height = 260, valueFormatter }: LineChartCardProps) {
  return (
    <Card className={className}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
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
              content={<CustomTooltip lines={lines} valueFormatter={valueFormatter} />}
            />
            {lines.map((line, i) => (
              <Area
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke}
                strokeWidth={2.5}
                fill={`url(#fill-${line.dataKey})`}
                name={line.name}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: line.stroke }}
                // primary series drawn on top
                style={{ filter: i === 0 ? "none" : "none" }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
