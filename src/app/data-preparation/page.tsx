"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Play } from "lucide-react";

export default function DataPreparationPage() {
  const runs = [
    { id: "DPR-088", date: "2026-06-20 10:00", records: 15420, outliers: 45, stockouts: 12, status: "success" },
    { id: "DPR-087", date: "2026-06-19 10:00", records: 15300, outliers: 42, stockouts: 10, status: "success" },
    { id: "DPR-086", date: "2026-06-18 10:00", records: 15000, outliers: 0, stockouts: 0, status: "failed" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Preparación de datos"
        description="Historial de corridas de limpieza, detección de outliers y construcción de series temporales."
        action={
          <Button>
            <Play className="w-4 h-4" />
            Nueva corrida
          </Button>
        }
      />
      <Table
        title="Corridas de preparación"
        data={runs}
        keyExtractor={(r) => r.id}
        columns={[
          { header: "Corrida", accessor: (r) => <span className="font-mono text-text-secondary">{r.id}</span> },
          { header: "Fecha", accessor: (r) => r.date },
          { header: "Registros limpios", accessor: (r) => <span className="font-semibold">{r.records.toLocaleString()}</span> },
          { header: "Outliers", accessor: (r) => r.outliers },
          { header: "Stockouts", accessor: (r) => r.stockouts },
          {
            header: "Estado",
            accessor: (r) => (
              <Badge variant={r.status === "success" ? "success" : "danger"} dot>
                {r.status === "success" ? "Completado" : "Fallido"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
