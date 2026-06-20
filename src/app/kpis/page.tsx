"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { CircularGauge } from "@/components/ui/CircularGauge";
import { Badge } from "@/components/ui/Table";
import { BarChart2, TrendingUp, TrendingDown, RefreshCcw, ShieldAlert } from "lucide-react";

export default function KPIsPage() {
  const kpis = [
    { label: "Cobertura de inventario", value: "28", suffix: " días", change: 5, icon: BarChart2, accent: "primary" as const },
    { label: "Riesgo de quiebre (stockout)", value: "12", suffix: "%", change: -3, icon: TrendingDown, accent: "danger" as const },
    { label: "Riesgo de sobrestock", value: "8", suffix: "%", change: 2, icon: TrendingUp, accent: "warning" as const },
    { label: "Rotación promedio", value: "4.5", suffix: "x", change: 4, icon: RefreshCcw, accent: "violet" as const },
  ];

  const health = [
    { label: "Productos en cobertura óptima", value: 72, color: "#10B981" },
    { label: "En riesgo de quiebre", value: 18, color: "#F2545B" },
    { label: "En sobrestock", value: 10, color: "#F5A623" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Indicadores"
        title="Indicadores clave (KPIs)"
        description="Métricas calculadas a partir del pronóstico FTGM y el estado actual del inventario."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <StatCard key={i} title={kpi.label} value={kpi.value} suffix={kpi.suffix} change={kpi.change} icon={kpi.icon} accent={kpi.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center text-center py-8">
          <CircularGauge value={82} size={148} label="82%" caption="salud global" color="#10B981" trackColor="#D6F5E7" />
          <h3 className="mt-4 font-semibold text-text-primary">Salud del inventario</h3>
          <p className="text-sm text-text-secondary mt-1 max-w-xs">Índice compuesto de cobertura, riesgo de quiebre y sobrestock.</p>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text-primary">Distribución del catálogo por estado</h3>
          </div>
          <div className="space-y-5">
            {health.map((h) => (
              <div key={h.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-text-secondary">{h.label}</span>
                  <span className="text-sm font-semibold text-text-primary">{h.value}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${h.value}%`, background: h.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant="success" dot>Saludable</Badge>
            <Badge variant="danger" dot>Atención requerida</Badge>
            <Badge variant="warning" dot>Optimizable</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
