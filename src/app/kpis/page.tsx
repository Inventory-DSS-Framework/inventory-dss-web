"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Table, Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { BarChart2, TrendingDown, TrendingUp, RefreshCcw, Sparkles } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { kpisApi } from "@/lib/api";
import type { KpiType } from "@/types/api";

const KPI_LABEL: Record<KpiType, string> = {
  coverage_days: "Cobertura (días)",
  stockout_risk: "Riesgo de quiebre",
  turnover: "Rotación",
  overstock_risk: "Riesgo de sobrestock",
};

export default function KPIsPage() {
  const companyId = useCompanyId();
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const kpis = useApi(
    () => (companyId ? kpisApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = kpis.data ?? [];

  const averages = useMemo(() => {
    const sums = new Map<KpiType, { total: number; count: number }>();
    for (const k of items) {
      const cur = sums.get(k.kpi_type) ?? { total: 0, count: 0 };
      cur.total += Number(k.value);
      cur.count += 1;
      sums.set(k.kpi_type, cur);
    }
    return (type: KpiType) => {
      const s = sums.get(type);
      return s && s.count ? s.total / s.count : 0;
    };
  }, [items]);

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
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Indicadores"
        title="Indicadores clave (KPIs)"
        description="Métricas calculadas a partir del pronóstico y el estado actual del inventario."
        action={
          <Button variant="violet" onClick={handleCalculate} disabled={working}>
            <Sparkles className="w-4 h-4" />
            {working ? "Calculando…" : "Calcular KPIs"}
          </Button>
        }
      />

      {actionError && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={KPI_LABEL.coverage_days} value={averages("coverage_days").toFixed(1)} suffix=" d" icon={BarChart2} accent="primary" />
        <StatCard title={KPI_LABEL.stockout_risk} value={averages("stockout_risk").toFixed(1)} suffix="%" icon={TrendingDown} accent="danger" />
        <StatCard title={KPI_LABEL.overstock_risk} value={averages("overstock_risk").toFixed(1)} suffix="%" icon={TrendingUp} accent="warning" />
        <StatCard title={KPI_LABEL.turnover} value={averages("turnover").toFixed(2)} suffix="x" icon={RefreshCcw} accent="violet" />
      </div>

      <DataState
        loading={kpis.loading}
        error={kpis.error}
        empty={items.length === 0}
        emptyMessage="Aún no hay KPIs. Ejecuta un pronóstico y luego calcula los KPIs."
        onRetry={kpis.reload}
      >
        <Table
          title="KPIs por producto"
          data={items}
          keyExtractor={(k) => k.id}
          columns={[
            { header: "Producto", accessor: (k) => <span className="font-mono text-text-secondary">{k.product_id.slice(0, 8)}</span> },
            { header: "Indicador", accessor: (k) => <Badge variant="default">{KPI_LABEL[k.kpi_type]}</Badge> },
            { header: "Valor", accessor: (k) => <span className="font-semibold">{Number(k.value).toFixed(2)}</span> },
            { header: "Calculado", accessor: (k) => k.computed_at.slice(0, 10) },
          ]}
        />
      </DataState>
    </div>
  );
}
