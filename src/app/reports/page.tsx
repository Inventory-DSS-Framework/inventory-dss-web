"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { FileText, Download } from "lucide-react";

export default function ReportsPage() {
  const reports = [
    { id: "REP-010", name: "Reporte de pronósticos - Junio", type: "Predicción", date: "2026-06-20", format: "PDF" },
    { id: "REP-009", name: "Dashboard KPIs consolidado", type: "KPIs", date: "2026-06-19", format: "Excel" },
    { id: "REP-008", name: "Sugerencias de compra Q3", type: "Recomendaciones", date: "2026-06-15", format: "PDF" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Salida"
        title="Reportes exportables"
        description="Genera y descarga reportes de pronósticos, KPIs y sugerencias."
        action={
          <Button>
            <FileText className="w-4 h-4" />
            Nuevo reporte
          </Button>
        }
      />
      <Table
        title="Reportes generados"
        data={reports}
        keyExtractor={(r) => r.id}
        columns={[
          { header: "ID", accessor: (r) => <span className="font-mono text-text-secondary">{r.id}</span> },
          { header: "Nombre del reporte", accessor: (r) => <span className="font-medium text-text-primary">{r.name}</span> },
          { header: "Tipo", accessor: (r) => <Badge variant="default">{r.type}</Badge> },
          { header: "Generación", accessor: (r) => r.date },
          { header: "Formato", accessor: (r) => <Badge variant={r.format === "PDF" ? "danger" : "success"}>{r.format}</Badge> },
          {
            header: "Acción",
            accessor: () => (
              <button className="inline-flex items-center gap-1 text-primary hover:text-primary-hover text-sm font-semibold">
                <Download className="w-4 h-4" /> Descargar
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
