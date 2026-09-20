"use client";

import { useId, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Truck } from "lucide-react";
import { useBrandColors } from "@/hooks/useBrandColors";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import type { ForecastResultDTO } from "@/types/api";
import type { OverviewProduct } from "@/types/ftgm";
import { periodLabel } from "./labels";

/**
 * The supporting visuals of a forecast result. Each one answers a different question that
 * the projection line alone cannot: how much per period, does my stock reach, when does it
 * run out against the supplier's wait, and which months are this product's season.
 */

/** Recharts hands the tooltip a readonly payload; this is the loosest shape we read from it. */
type TipProps = {
  active?: boolean;
  label?: unknown;
  payload?: readonly { name?: unknown; value?: unknown; payload?: Record<string, unknown> }[];
};

const n0 = (v: number) => Math.round(v).toLocaleString("es-PE");
const n1 = (v: number) => (v >= 10 ? n0(v) : (Math.round(v * 10) / 10).toLocaleString("es-PE"));

/** Shared glass panel for the tooltips of these charts. */
function Panel({ label, rows }: { label: string; rows: { k: string; v: string; color?: string }[] }) {
  return (
    <div className="glass min-w-[170px] rounded-2xl px-4 py-3 shadow-soft-xl">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 text-xs text-text-secondary">
              {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
              {r.k}
            </span>
            <span className="font-display text-xs font-semibold tabular-nums text-text-primary">{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Cuánto venderás cada periodo ─────────────────────────────────────────── */

/**
 * The projection read one period at a time: a bar for the expected units and a whisker for
 * the probable range. Easier to quote than a curve ("en octubre, entre 4 y 7").
 */
export function ForecastBars({
  result,
  frequency,
  height = 210,
}: {
  result: ForecastResultDTO;
  frequency: string;
  height?: number;
}) {
  const c = useBrandColors();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const data = useMemo(
    () =>
      result.points.map((p) => {
        const v = Math.max(0, Number(p.predicted_demand));
        const lo = p.lower_bound != null ? Math.max(0, Number(p.lower_bound)) : null;
        const hi = p.upper_bound != null ? Math.max(0, Number(p.upper_bound)) : null;
        return {
          name: p.period_date,
          u: v,
          lo,
          hi,
          // Recharts reads the whisker as [hacia abajo, hacia arriba] desde la barra.
          err: lo != null && hi != null ? [Math.max(0, v - lo), Math.max(0, hi - v)] : null,
        };
      }),
    [result],
  );

  if (!data.length) return <p className="py-12 text-center text-sm text-text-muted">Sin periodos proyectados.</p>;

  const top = Math.max(...data.map((d) => d.hi ?? d.u), 1);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id={`fb-${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c.accent2} stopOpacity={0.95} />
              <stop offset="100%" stopColor={c.primary} stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={c.grid} />
          <XAxis
            dataKey="name"
            tickFormatter={(v) => periodLabel(String(v), frequency)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: c.muted, fontSize: 11 }}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: c.muted, fontSize: 11 }}
            width={44}
            domain={[0, Math.ceil(top * 1.15)]}
          />
          <Tooltip
            cursor={{ fill: c.primary, fillOpacity: 0.06 }}
            content={(props: TipProps) => {
              const row = props.active ? props.payload?.[0]?.payload : null;
              if (!row) return null;
              const lo = row.lo as number | null;
              const hi = row.hi as number | null;
              return (
                <Panel
                  label={periodLabel(String(props.label), frequency)}
                  rows={[
                    { k: "Venderías", v: `${n1(row.u as number)} u`, color: c.primary },
                    ...(lo != null && hi != null ? [{ k: "Rango probable", v: `${n0(lo)} – ${n0(hi)} u`, color: c.accent2 }] : []),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="u" fill={`url(#fb-${uid})`} radius={[8, 8, 4, 4]} maxBarSize={46} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={d.name} fillOpacity={0.55 + (0.45 * (i + 1)) / data.length} />
            ))}
            <ErrorBar dataKey="err" width={5} strokeWidth={1.6} stroke={c.accent} direction="y" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── ¿Te alcanza el stock? ────────────────────────────────────────────────── */

/**
 * The horizon's demand split in two: what the shelf already covers and what would have to
 * be bought. The ring is the answer to "¿me alcanza?" before reading a single number.
 */
export function StockDonut({ p, height = 176 }: { p: OverviewProduct; height?: number }) {
  const c = useBrandColors();
  const need = Math.max(0, p.total_forecast_units);
  const covered = Math.min(p.on_hand, need);
  const missing = Math.max(0, need - p.on_hand);
  const share = need > 0 ? Math.min(100, Math.round((covered / need) * 100)) : 100;

  const data =
    need > 0
      ? [
          { name: "Cubierto con tu stock", value: covered, color: c.success },
          { name: "Faltaría comprar", value: missing, color: c.warning },
        ].filter((d) => d.value > 0)
      : [{ name: "Sin demanda proyectada", value: 1, color: c.grid }];

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="66%"
            outerRadius="94%"
            paddingAngle={data.length > 1 ? 3 : 0}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          {need > 0 && (
            <Tooltip
              content={(props: TipProps) => {
                const e = props.active ? props.payload?.[0] : null;
                if (!e) return null;
                const color = (e.payload as { color?: string } | undefined)?.color;
                return <Panel label="Del total que venderás" rows={[{ k: String(e.name), v: `${n0(Number(e.value))} u`, color }]} />;
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-[30px] font-semibold leading-none text-text-primary tabular-nums">{share}%</p>
          <p className="mt-1 text-[11px] leading-tight text-text-muted">
            {need > 0 ? "ya lo tienes" : "sin demanda"}
          </p>
        </div>
      </div>
    </div>
  );
}

/** The donut with its legend and the purchase it implies — the 40% column next to the chart. */
export function StockCoverCard({ p }: { p: OverviewProduct }) {
  const c = useBrandColors();
  const need = Math.max(0, p.total_forecast_units);
  const covered = Math.min(p.on_hand, need);
  const missing = Math.max(0, need - p.on_hand);
  const spare = Math.max(0, p.on_hand - need);

  return (
    <div className="flex h-full flex-col">
      <StockDonut p={p} />
      <div className="mt-4 space-y-2">
        <Row color={c.success} label="Cubierto con tu stock" value={`${n0(covered)} u`} />
        {missing > 0 ? (
          <Row color={c.warning} label="Faltaría comprar" value={`${n0(missing)} u`} />
        ) : (
          <Row color={c.grid} label="Te sobrarían" value={`${n0(spare)} u`} />
        )}
        <Row color={c.muted} label="Venderías en total" value={`${n0(need)} u`} />
      </div>
      {p.suggested_qty > 0 && (
        <p className="mt-4 rounded-xl bg-surface-soft px-3 py-2.5 text-xs leading-relaxed text-text-secondary">
          Sugerencia: comprar <span className="font-semibold text-text-primary">{Math.ceil(p.suggested_qty)} u</span> ≈{" "}
          <span className="font-semibold text-text-primary">{soles(p.suggested_investment)}</span>, contando tu stock
          mínimo de {p.safety_stock} u.
        </p>
      )}
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="flex min-w-0 items-center gap-2 text-text-secondary">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-display text-[13px] font-semibold text-text-primary tabular-nums">{value}</span>
    </div>
  );
}

/* ── Hasta cuándo te alcanza ──────────────────────────────────────────────── */

/**
 * Days on one line: how long the stock lasts against how long the supplier takes and how
 * far the forecast looks. If the green bar ends before the truck, the order is already late.
 */
export function CoverageTimeline({ p, horizonDays }: { p: OverviewProduct; horizonDays: number }) {
  const daily = p.frequency === "weekly" ? p.next_period_units / 7 : p.next_period_units / 30;
  const cover = p.coverage_days != null ? Math.round(p.coverage_days) : daily > 0 ? Math.round(p.on_hand / daily) : null;
  const lead = p.lead_time_days;
  const scale = Math.max(cover ?? 0, lead, horizonDays, 30) * 1.12;
  const at = (d: number) => `${Math.min(100, (d / scale) * 100)}%`;

  const late = cover != null && cover < lead;
  const tight = cover != null && !late && cover < lead + 14;
  const tone = cover == null ? "muted" : late ? "danger" : tight ? "warning" : "success";
  const bar =
    tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : tone === "success" ? "bg-success" : "bg-border";

  return (
    <div>
      <div className="relative mt-6 h-3 w-full rounded-full bg-surface-muted">
        {cover != null && <div className={cn("h-3 rounded-full transition-all", bar)} style={{ width: at(cover) }} />}

        {/* Lead time: the earliest a new order could land on the shelf. */}
        <Marker left={at(lead)} tone="text-text-secondary">
          <Truck className="h-3.5 w-3.5" />
          <span className="whitespace-nowrap">Proveedor · {lead} d</span>
        </Marker>

        {/* Where the prediction stops looking. */}
        <Marker left={at(horizonDays)} tone="text-text-muted" below>
          <span className="whitespace-nowrap">Predicción · {horizonDays} d</span>
        </Marker>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            tone === "danger"
              ? "bg-danger-soft text-danger"
              : tone === "warning"
                ? "bg-warning-soft text-warning"
                : tone === "success"
                  ? "bg-success-soft text-success"
                  : "bg-surface-muted text-text-secondary",
          )}
        >
          {tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {cover == null
            ? "Sin ritmo de venta medible"
            : late
              ? `Ya vas tarde: te alcanza ${cover} d y el pedido demora ${lead} d`
              : tight
                ? `Justo: te alcanza ${cover} d y el pedido demora ${lead} d`
                : `Con holgura: te alcanza ${cover} d frente a ${lead} d de espera`}
        </span>
        <p className="text-xs text-text-muted">
          Al ritmo de {n1(Math.max(0, p.next_period_units))} u por {p.frequency === "weekly" ? "semana" : "mes"}.
        </p>
      </div>
    </div>
  );
}

function Marker({ left, tone, below, children }: { left: string; tone: string; below?: boolean; children: React.ReactNode }) {
  // Cerca de los bordes la etiqueta se alinea hacia dentro para no cortarse.
  const share = parseFloat(left);
  const align = share > 82 ? "-translate-x-full" : share < 12 ? "translate-x-0" : "-translate-x-1/2";
  return (
    <div className="absolute top-0 h-3" style={{ left }}>
      <span className="absolute -top-1 left-0 h-5 w-0.5 -translate-x-1/2 rounded-full bg-border" />
      <span
        className={cn(
          "absolute left-0 flex items-center gap-1 text-[11px] font-medium",
          align,
          below ? "top-6" : "-top-7",
          tone,
        )}
      >
        {children}
      </span>
    </div>
  );
}

/* ── En qué meses vendes más ──────────────────────────────────────────────── */

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * The product's own season, averaged over every year of history. The tallest month is the
 * one worth stocking for; the flattest chart means "this product sells the same all year".
 */
export function SeasonalityBars({ result, height = 210 }: { result: ForecastResultDTO; height?: number }) {
  const c = useBrandColors();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { data, months } = useMemo(() => {
    const sum = new Array(12).fill(0);
    const count = new Array(12).fill(0);
    result.history.forEach((h) => {
      const m = Number(h.period_date.slice(5, 7)) - 1;
      if (m < 0 || m > 11) return;
      sum[m] += Number(h.observed);
      count[m] += 1;
    });
    const rows = MONTHS.map((name, i) => ({ name, u: count[i] ? sum[i] / count[i] : 0, seen: count[i] > 0 }));
    return { data: rows, months: rows.filter((r) => r.seen).length };
  }, [result]);

  if (months < 3) {
    return (
      <p className="py-12 text-center text-sm text-text-muted">
        Todavía no hay meses suficientes para ver la temporada del producto.
      </p>
    );
  }

  const top = Math.max(...data.map((d) => d.u), 1);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id={`sb-${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c.primary} stopOpacity={0.55} />
              <stop offset="100%" stopColor={c.primary} stopOpacity={0.12} />
            </linearGradient>
            <linearGradient id={`sb-top-${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c.accent2} stopOpacity={1} />
              <stop offset="100%" stopColor={c.accent2} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={c.grid} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 10.5 }} interval={0} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 11 }} width={44} />
          <Tooltip
            cursor={{ fill: c.primary, fillOpacity: 0.06 }}
            content={(props: TipProps) => {
              const row = props.active ? props.payload?.[0]?.payload : null;
              if (!row) return null;
              return (
                <Panel
                  label={String(props.label)}
                  rows={[
                    {
                      k: row.seen ? "Promedio vendido" : "Sin ventas registradas",
                      v: row.seen ? `${n1(row.u as number)} u` : "—",
                      color: c.accent2,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="u" radius={[8, 8, 4, 4]} maxBarSize={34} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.u >= top * 0.98 && d.u > 0 ? `url(#sb-top-${uid})` : `url(#sb-${uid})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
