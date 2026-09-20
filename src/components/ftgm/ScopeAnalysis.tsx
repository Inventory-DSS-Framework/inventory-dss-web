"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ExternalLink, Loader2, PackageCheck, PackageX, RefreshCw, ShoppingBag, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Table";
import { cn } from "@/lib/utils";
import { ftgmApi } from "@/lib/apis/ftgm";
import type { ProductInsight, ProductRunEntry, ScopePreview, PreviewProduct } from "@/types/ftgm";
import { ForecastVsActualChart } from "./ForecastVsActualChart";
import { ProductInsightChart } from "./ProductInsightChart";
import { Sparkline } from "./Sparkline";
import { dateLabel, frequencyLabel, num, pct, readinessMeta, trackingMeta, units } from "./labels";

/** Step 2 — per-product analysis with expandable premium charts + consolidated panel. */
export function ScopeAnalysis({ companyId, preview }: { companyId: string; preview: ScopePreview }) {
  const [open, setOpen] = useState<string | null>(preview.products.length === 1 ? preview.products[0].product_id : null);
  const t = preview.totals;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Productos incluidos" value={`${t.products_included}`} hint={`de ${t.products_total} en el alcance`} />
        <Tile label="Listos para FTGM" value={`${t.products_ready}`} hint={`${t.products_low_data} con baseline`} tone="success" />
        <Tile label="Frecuencia" value={frequencyLabel[t.frequency ?? "auto"] ?? "—"} hint={`hasta ${t.max_periods} periodos`} />
        <Tile label="Puntos de datos" value={num(t.total_data_points)} hint="periodos que ve el motor" />
        <Tile label="Unidades históricas" value={num(t.total_units)} hint={t.date_start ? `desde ${dateLabel(t.date_start)}` : "—"} />
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="hidden grid-cols-[minmax(0,2.2fr)_130px_repeat(4,minmax(0,1fr))_minmax(0,1.3fr)_24px] items-center gap-4 border-b border-border bg-surface-soft/60 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted lg:grid">
          <span>Producto</span>
          <span>Demanda 24 m</span>
          <span>Unidades</span>
          <span>Periodos</span>
          <span>Reabastec.</span>
          <span>Quiebres</span>
          <span>Preparación</span>
          <span />
        </div>
        <div className="divide-y divide-border-soft">
          {preview.products.map((p) => (
            <ProductRow
              key={p.product_id}
              companyId={companyId}
              product={p}
              open={open === p.product_id}
              onToggle={() => setOpen(open === p.product_id ? null : p.product_id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "success" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-semibold tracking-tight", tone === "success" ? "text-success" : "text-text-primary")}>
        {value}
      </p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

function ProductRow({
  companyId,
  product: p,
  open,
  onToggle,
}: {
  companyId: string;
  product: PreviewProduct;
  open: boolean;
  onToggle: () => void;
}) {
  const r = readinessMeta[p.readiness];
  const periodWord = p.frequency === "weekly" ? "sem" : "meses";
  return (
    <div className={cn(!p.included && "bg-surface-soft/40")}>
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-1 items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-accent-violet-soft/15 lg:grid-cols-[minmax(0,2.2fr)_130px_repeat(4,minmax(0,1fr))_minmax(0,1.3fr)_24px] lg:gap-4"
      >
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold", p.included ? "text-text-primary" : "text-text-muted")}>{p.name}</p>
          <p className="font-mono text-[11px] text-text-muted">
            {p.sku} · stock {num(p.on_hand)}
          </p>
        </div>
        <Sparkline values={p.monthly_series.map((s) => s.units)} />
        <Metric value={num(p.total_units)} sub={`${num(p.sales_count)} ventas`} />
        <Metric value={p.periods ? `${p.periods} ${periodWord}` : "—"} sub={p.zero_share != null ? `${pct(p.zero_share * 100, 0)} sin venta` : "sin historia"} />
        <Metric value={num(p.restocks_count)} sub={p.last_restock_date ? `últ. ${dateLabel(p.last_restock_date)}` : "sin compras"} />
        <Metric
          value={p.stockout_periods ? `${p.stockout_periods} per.` : "0"}
          sub={p.lost_sale_attempts ? `${p.lost_sale_attempts} intentos perdidos` : `${p.stockout_days} días`}
          warn={p.stockout_periods > 0}
        />
        <div className="min-w-0">
          <Badge variant={r.tone} dot>
            {r.label}
          </Badge>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-text-muted">{p.reason}</p>
        </div>
        <ChevronDown className={cn("hidden h-4 w-4 text-text-muted transition-transform lg:block", open && "rotate-180")} />
      </button>
      {open && <ProductDetail companyId={companyId} product={p} />}
    </div>
  );
}

function Metric({ value, sub, warn }: { value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn("text-sm font-semibold tabular-nums", warn ? "text-warning" : "text-text-primary")}>{value}</p>
      {sub && <p className="truncate text-[11px] text-text-muted">{sub}</p>}
    </div>
  );
}

function ProductDetail({ companyId, product: p }: { companyId: string; product: PreviewProduct }) {
  const [freq, setFreq] = useState<"weekly" | "monthly">("weekly");
  const [insight, setInsight] = useState<ProductInsight | null>(null);
  const [runs, setRuns] = useState<ProductRunEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setInsight(null);
    ftgmApi
      .productInsight(companyId, p.product_id, freq, freq === "weekly" ? 52 : 36)
      .then((d) => alive && setInsight(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "No se pudo cargar"));
    return () => {
      alive = false;
    };
  }, [companyId, p.product_id, freq]);

  useEffect(() => {
    let alive = true;
    ftgmApi
      .byProduct(companyId, p.product_id, 3)
      .then((d) => alive && setRuns(d))
      .catch(() => alive && setRuns([]));
    return () => {
      alive = false;
    };
  }, [companyId, p.product_id]);

  const lastTracked = runs?.find((r) => r.tracking && r.tracking.periods_elapsed > 0) ?? runs?.find((r) => r.tracking);

  return (
    <div className="space-y-4 border-t border-border-soft bg-surface-soft/40 px-5 py-5 animate-fade-up">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Fact icon={ShoppingBag} label="Primera / última venta" value={`${dateLabel(p.first_sale)} → ${dateLabel(p.last_sale)}`} />
        <Fact icon={TrendingUp} label="Promedio por periodo" value={`${num(p.avg_per_period, 1)} u`} />
        <Fact icon={RefreshCw} label="Último reabastecimiento" value={p.last_restock_date ? `${dateLabel(p.last_restock_date)} · ${num(p.last_restock_qty)} u` : "—"} />
        <Fact
          icon={p.stockout_days ? PackageX : PackageCheck}
          label="Quiebres detectados"
          value={`${p.stockout_days} días · ${num(p.lost_units)} u perdidas`}
        />
      </div>
      {p.frequency_reason && <p className="text-xs text-text-secondary">Frecuencia: {p.frequency_reason}</p>}

      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-display text-sm font-semibold text-text-primary">Stock, ventas y reabastecimientos</h4>
            <p className="text-xs text-text-muted">El contexto de la demanda: dónde faltó producto y cuándo se repuso.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border bg-surface-soft p-0.5 text-xs">
              {(["weekly", "monthly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFreq(f)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-medium",
                    freq === f ? "bg-surface text-text-primary shadow-soft" : "text-text-muted",
                  )}
                >
                  {f === "weekly" ? "Semanal" : "Mensual"}
                </button>
              ))}
            </div>
            <Link href={`/inventory/${p.product_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-violet hover:opacity-80">
              Ficha <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
        {error ? (
          <p className="py-10 text-center text-sm text-danger">{error}</p>
        ) : insight ? (
          <ProductInsightChart insight={insight} />
        ) : (
          <div className="grid h-[280px] place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent-violet" />
          </div>
        )}
      </div>

      {lastTracked?.tracking && (
        <div className="rounded-3xl border border-accent-violet/25 bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-display text-sm font-semibold text-text-primary">Lo que pronosticamos vs lo que pasó</h4>
              <p className="text-xs text-text-muted">
                Ejecución del {dateLabel(lastTracked.run.created_at)} ·{" "}
                <Link href={`/forecasting?run=${lastTracked.run.id}`} className="font-semibold text-accent-violet hover:opacity-80">
                  ver resultado
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={trackingMeta[lastTracked.tracking.status].tone} dot>
                {trackingMeta[lastTracked.tracking.status].label}
              </Badge>
              <span className="text-xs text-text-secondary">
                Diferencia promedio con lo que vendiste de verdad: {pct(lastTracked.tracking.mape)}
              </span>
            </div>
          </div>
          <ForecastVsActualChart tracking={lastTracked.tracking} />
          <p className="mt-2 text-xs text-text-muted">
            A la fecha: pronosticado {units(lastTracked.tracking.forecast_to_date)} · vendido {units(lastTracked.tracking.actual_to_date)}
          </p>
        </div>
      )}

      {!p.included && (
        <p className="flex items-center gap-2 text-xs text-text-muted">
          <AlertTriangle className="h-3.5 w-3.5" /> {p.reason}
        </p>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof ShoppingBag; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-border-soft bg-surface px-3.5 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-violet" />
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}
