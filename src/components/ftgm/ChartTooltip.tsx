"use client";

/** Glass tooltip shared by the FTGM charts. `format` maps (dataKey, value) to text. */
export function ChartTooltip({
  active,
  payload,
  label,
  names,
  format,
  labelFormat,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: unknown; color?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  names: Record<string, string>;
  format?: (key: string, value: unknown) => string;
  labelFormat?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && names[String(p.dataKey)]);
  if (!rows.length) return null;
  return (
    <div className="glass min-w-[180px] rounded-2xl px-4 py-3 shadow-soft-xl">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
        {labelFormat ? labelFormat(String(label)) : label}
      </p>
      <div className="space-y-1.5">
        {rows.map((entry) => {
          const key = String(entry.dataKey);
          const v = entry.value;
          const text = format
            ? format(key, v)
            : Array.isArray(v)
              ? `${Number(v[0]).toFixed(0)} – ${Number(v[1]).toFixed(0)}`
              : String(Math.round(Number(v)));
          return (
            <div key={key} className="flex items-center justify-between gap-5">
              <span className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                {names[key]}
              </span>
              <span className="font-display text-xs font-semibold tabular-nums text-text-primary">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LegendChip({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface-soft/70 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
      <span
        className="h-0.5 w-3.5 rounded-full"
        style={dashed ? { borderTop: `2px dashed ${color}`, height: 0 } : { background: color, height: 3 }}
      />
      {label}
    </span>
  );
}
