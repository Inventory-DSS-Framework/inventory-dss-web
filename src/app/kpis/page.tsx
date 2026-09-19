"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart2, RefreshCcw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { kpisApi, productsApi } from "@/lib/api";
import type { KpiDTO, KpiType } from "@/types/api";

const KPI_LABEL: Record<KpiType, string> = {
  coverage_days: "Cobertura",
  stockout_risk: "Riesgo de quiebre",
  turnover: "Rotación",
  overstock_risk: "Riesgo de sobrestock",
};

interface Row {
  product_id: string;
  values: Partial<Record<KpiType, number>>;
  computed_at: string;
}

export default function KPIsPage() {
  const companyId = useCompanyId();
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "risk" | "overstock">("all");

  const kpis = useApi(() => (companyId ? kpisApi.list(companyId) : Promise.resolve([])), [companyId]);
  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const productOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products.data]);

  // Latest value per (product, type), pivoted to one row per product.
  const rows = useMemo(() => {
    const latest = new Map<string, KpiDTO>();
    for (const k of kpis.data ?? []) {
      const key = `${k.product_id}:${k.kpi_type}`;
      const prev = latest.get(key);
      if (!prev || k.computed_at > prev.computed_at) latest.set(key, k);
    }
    const byProduct = new Map<string, Row>();
    for (const k of latest.values()) {
      const row = byProduct.get(k.product_id) ?? { product_id: k.product_id, values: {}, computed_at: k.computed_at };
      row.values[k.kpi_type] = Number(k.value);
      if (k.computed_at > row.computed_at) row.computed_at = k.computed_at;
      byProduct.set(k.product_id, row);
    }
    return [...byProduct.values()].sort((a, b) => (b.values.stockout_risk ?? 0) - (a.values.stockout_risk ?? 0));
  }, [kpis.data]);

  const avg = (t: KpiType) => {
    const v = rows.map((r) => r.values[t]).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };

  const shown = rows.filter((r) =>
    filter === "risk" ? (r.values.stockout_risk ?? 0) >= 50 : filter === "overstock" ? (r.values.overstock_risk ?? 0) >= 50 : true,
  );

  const handleCalculate = async () => {
    if (!companyId) return;
    setWorking(true);
    setActionError(null);
    try {
      await kpisApi.calculate(companyId);
      kpis.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo calcular");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="Motor FTGM"
        eyebrowTone="violet"
        title="Indicadores de inventario"
        description="Cobertura, riesgo de quiebre, sobrestock y rotación de cada producto, calculados con su pronóstico FTGM más reciente."
        action={
          <Button variant="violet" onClick={handleCalculate} loading={working}>
            <Sparkles className="h-4 w-4" /> Recalcular KPIs
          </Button>
        }
      />

      {actionError && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{actionError}</div>}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Cobertura media" value={avg("coverage_days").toFixed(1)} suffix=" d" icon={BarChart2} accent="violet" />
        <StatCard title="Riesgo de quiebre medio" value={avg("stockout_risk").toFixed(1)} suffix="%" icon={TrendingDown} accent="danger" />
        <StatCard title="Riesgo de sobrestock medio" value={avg("overstock_risk").toFixed(1)} suffix="%" icon={TrendingUp} accent="warning" />
        <StatCard title="Rotación media" value={avg("turnover").toFixed(2)} suffix="x" icon={RefreshCcw} accent="primary" />
      </div>

      <DataState
        loading={kpis.loading}
        error={kpis.error}
        empty={rows.length === 0}
        onRetry={kpis.reload}
        emptyState={
          <EmptyState
            icon={BarChart2}
            title="Aún no hay KPIs"
            description="Se calculan solos al terminar un pronóstico del motor FTGM, o puedes recalcularlos con el botón."
            action={{ label: "Ir al motor FTGM", href: "/forecasting" }}
          />
        }
      >
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h3 className="font-display text-[15px] font-semibold text-text-primary">KPIs por producto</h3>
            <div className="w-56">
              <Select
                size="sm"
                value={filter}
                onChange={(v) => setFilter(v as typeof filter)}
                options={[
                  { value: "all", label: "Todos los productos" },
                  { value: "risk", label: "Riesgo de quiebre ≥ 50%" },
                  { value: "overstock", label: "Sobrestock ≥ 50%" },
                ]}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-4 py-3">{KPI_LABEL.coverage_days}</th>
                  <th className="px-4 py-3">{KPI_LABEL.stockout_risk}</th>
                  <th className="px-4 py-3">{KPI_LABEL.overstock_risk}</th>
                  <th className="px-4 py-3">{KPI_LABEL.turnover}</th>
                  <th className="px-4 py-3">Calculado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shown.map((r) => {
                  const p = productOf(r.product_id);
                  return (
                    <tr key={r.product_id} className="hover:bg-accent-violet-soft/10">
                      <td className="px-6 py-3">
                        {p ? (
                          <Link href={`/inventory/${p.id}`} className="block max-w-[280px] truncate font-medium text-text-primary hover:text-accent-violet">
                            {p.name}
                          </Link>
                        ) : (
                          <span className="font-mono text-text-secondary">{r.product_id.slice(0, 8)}</span>
                        )}
                        {p && <span className="font-mono text-[11px] text-text-muted">{p.sku}</span>}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{r.values.coverage_days != null ? `${r.values.coverage_days.toFixed(0)} d` : "—"}</td>
                      <td className="px-4 py-3">
                        <RiskBar value={r.values.stockout_risk} tone="danger" />
                      </td>
                      <td className="px-4 py-3">
                        <RiskBar value={r.values.overstock_risk} tone="warning" />
                      </td>
                      <td className="px-4 py-3 tabular-nums">{r.values.turnover != null ? `${r.values.turnover.toFixed(2)}x` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{r.computed_at.slice(0, 10)}</td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-text-muted">
                      <Badge>Sin productos para este filtro</Badge>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </DataState>
    </div>
  );
}

function RiskBar({ value, tone }: { value: number | undefined; tone: "danger" | "warning" }) {
  if (value == null) return <span className="text-text-muted">—</span>;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn("h-full rounded-full", v >= 50 ? (tone === "danger" ? "bg-danger" : "bg-warning") : v >= 20 ? "bg-warning" : "bg-success")}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="w-10 text-xs tabular-nums text-text-secondary">{v.toFixed(0)}%</span>
    </div>
  );
}
