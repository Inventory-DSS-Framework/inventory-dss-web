"use client";

import Link from "next/link";
import { ArrowRight, Boxes, CalendarClock, PackageSearch, ShoppingCart, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import type { ForecastResultDTO } from "@/types/api";
import type { OverviewProduct, ProductDiagnostics } from "@/types/ftgm";
import { ACTIONS, decide } from "./decisions";

/**
 * One card with the whole decision for the product on screen: what to do, why, the four
 * numbers that justify it and the button that acts on it. It replaces the old pair of
 * blocks (the action list + the restock card), which said the same thing twice.
 */

const TONE: Record<string, { chip: string; ring: string; card: string }> = {
  danger: { chip: "bg-danger text-white", ring: "bg-danger-soft text-danger", card: "border-danger/30 bg-danger-soft/20" },
  warning: { chip: "bg-warning text-white", ring: "bg-warning-soft text-warning", card: "border-warning/30 bg-warning-soft/20" },
  success: { chip: "bg-success text-white", ring: "bg-success-soft text-success", card: "border-success/30 bg-success-soft/15" },
  violet: { chip: "bg-accent-violet text-white", ring: "bg-accent-violet-soft text-accent-violet", card: "border-accent-violet/25 bg-accent-violet-soft/15" },
  primary: { chip: "bg-primary text-white", ring: "bg-primary-soft text-primary", card: "border-primary/25 bg-primary-soft/15" },
  default: { chip: "bg-text-secondary text-white", ring: "bg-surface-muted text-text-secondary", card: "border-border" },
};

export function DecisionHero({
  p,
  diag,
  result,
}: {
  p: OverviewProduct;
  diag?: ProductDiagnostics;
  result?: ForecastResultDTO;
}) {
  const d = decide(p);
  const a = ACTIONS[d.action];
  const t = TONE[a.tone] ?? TONE.default;
  const buy = p.suggested_qty > 0;
  const perLabel = p.frequency === "weekly" ? "por semana" : "por mes";

  const recent = (result?.history ?? []).slice(-10).map((h) => Number(h.observed));
  const cover = d.coverDays;
  const lead = p.lead_time_days;

  return (
    <Card className={cn("flex flex-col gap-5 p-6 sm:p-7", t.card)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", t.ring)}>
            <a.icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]", t.chip)}>
              {a.title}
            </span>
            <h3 className="mt-2 truncate font-display text-xl font-semibold text-text-primary" title={p.name}>
              {p.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">{d.sentence}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/inventory/${p.product_id}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-soft hover:text-text-primary"
          >
            <PackageSearch className="h-4 w-4" /> Ver producto
          </Link>
          {buy && (
            <Link href="/purchases/new" className="btn btn-primary h-10 gap-1.5 px-4 text-xs">
              Registrar compra <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          icon={TrendingUp}
          label="Vendes"
          value={d.rate}
          hint={diag?.units_per_month != null ? `≈ ${Math.round(diag.units_per_month)} u al mes` : `ritmo ${perLabel}`}
          visual={<Spark values={recent} />}
        />
        <Tile
          icon={Boxes}
          label="Tienes"
          value={`${Math.round(p.on_hand)} u`}
          hint={p.safety_stock > 0 ? `mínimo recomendado ${p.safety_stock} u` : "en tu almacén hoy"}
          visual={<Gauge value={p.on_hand} target={Math.max(p.safety_stock, 1)} good={p.on_hand >= p.safety_stock} />}
        />
        <Tile
          icon={CalendarClock}
          label="Te alcanza"
          value={cover != null ? `${cover} d` : "—"}
          hint={`tu proveedor demora ${lead} d`}
          visual={<Gauge value={cover ?? 0} target={Math.max(lead, 1)} good={cover == null || cover >= lead} />}
        />
        <Tile
          icon={ShoppingCart}
          label="Comprar ahora"
          value={buy ? `${Math.ceil(p.suggested_qty)} u` : "0 u"}
          hint={buy ? `≈ ${soles(p.suggested_investment)}` : "no hace falta por ahora"}
          accent={buy}
        />
      </div>

      {diag?.rotation && (
        <p className="text-xs text-text-muted">
          Rotación <span className="font-semibold text-text-secondary">{diag.rotation}</span>
          {diag.units_per_month != null && <> · ≈ {Math.round(diag.units_per_month)} u al mes</>}
          {p.trend_pct != null && Math.abs(p.trend_pct) >= 3 && (
            <>
              {" "}
              · tendencia {p.trend_pct > 0 ? "al alza" : "a la baja"} ({Math.abs(Math.round(p.trend_pct))}%)
            </>
          )}
        </p>
      )}
    </Card>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  visual,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint?: string;
  visual?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl bg-surface px-4 py-3.5 shadow-soft", accent && "ring-1 ring-primary/25")}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1.5 truncate font-display text-[26px] font-semibold leading-none text-text-primary tabular-nums">
        {value}
      </p>
      <div className="mt-2 h-4">{visual}</div>
      {hint && <p className="mt-1 truncate text-[11px] text-text-muted">{hint}</p>}
    </div>
  );
}

/** Last periods as a 10-point sparkline: the rate above it, seen as a shape. */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 100;
  const h = 16;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-4 w-full" aria-hidden>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="rgb(var(--c-primary))"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** How the number compares with the threshold that matters (safety stock, lead time). */
function Gauge({ value, target, good }: { value: number; target: number; good: boolean }) {
  const share = Math.max(4, Math.min(100, (value / (target * 2)) * 100));
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className={cn("h-1.5 rounded-full", good ? "bg-success" : "bg-warning")} style={{ width: `${share}%` }} />
      <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
    </div>
  );
}
