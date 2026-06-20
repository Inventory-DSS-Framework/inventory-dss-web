"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { demandVsForecastData } from "@/mocks/data/dashboard";
import { Activity } from "lucide-react";

export default function ForecastingPage() {
  const forecasts = [
    { id: "FCT-991", date: "2026-06-20 10:05", model: "FTGM", horizon: "30 días", mape: "8.5%", status: "success" },
    { id: "FCT-990", date: "2026-06-19 10:05", model: "FTGM", horizon: "30 días", mape: "8.2%", status: "success" },
    { id: "FCT-989", date: "2026-06-18 10:05", model: "ARIMA Baseline", horizon: "30 días", mape: "15.4%", status: "success" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Inteligencia"
        title="Predicción de demanda"
        description="Ejecuciones del motor FTGM y visualización de pronósticos por producto."
        action={
          <Button variant="violet">
            <Activity className="w-4 h-4" />
            Ejecutar forecast
          </Button>
        }
      />

      <LineChartCard
        title="Demanda observada vs. pronóstico (FTGM)"
        data={demandVsForecastData}
        height={280}
        lines={[
          { dataKey: "actual", name: "Demanda real", stroke: "#3358F4" },
          { dataKey: "forecast", name: "Pronóstico FTGM", stroke: "#7C5CFC" },
        ]}
      />

      <Table
        title="Historial de ejecuciones"
        data={forecasts}
        keyExtractor={(f) => f.id}
        columns={[
          { header: "Ejecución", accessor: (f) => <span className="font-mono text-text-secondary">{f.id}</span> },
          { header: "Fecha", accessor: (f) => f.date },
          { header: "Modelo", accessor: (f) => <span className="font-medium text-text-primary">{f.model}</span> },
          { header: "Horizonte", accessor: (f) => f.horizon },
          { header: "MAPE global", accessor: (f) => <span className="font-semibold">{f.mape}</span> },
          {
            header: "Estado",
            accessor: (f) => (
              <Badge variant={f.status === "success" ? "success" : "danger"} dot>
                {f.status === "success" ? "Completado" : "Fallido"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
