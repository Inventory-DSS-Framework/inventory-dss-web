"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { FileSpreadsheet, FileText, Download } from "lucide-react";

export default function FilesPage() {
  const files = [
    { id: "FIL-221", name: "historico_ventas_2025.csv", type: "Dataset", size: "15.2 MB", date: "2026-06-20", status: "active" },
    { id: "FIL-220", name: "Reporte_Q1.pdf", type: "Reporte", size: "1.5 MB", date: "2026-06-18", status: "active" },
    { id: "FIL-219", name: "inventario_2024.xlsx", type: "Dataset", size: "8.1 MB", date: "2026-05-10", status: "archived" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Salida"
        title="Gestión de archivos"
        description="Repositorio central de datasets subidos y reportes generados."
      />
      <Table
        title="Archivos"
        data={files}
        keyExtractor={(f) => f.id}
        columns={[
          {
            header: "",
            className: "w-12",
            accessor: (f) => (
              <div className="w-9 h-9 rounded-lg bg-surface-soft flex items-center justify-center">
                {f.type === "Dataset" ? <FileSpreadsheet className="w-4 h-4 text-success" /> : <FileText className="w-4 h-4 text-danger" />}
              </div>
            ),
          },
          { header: "Nombre", accessor: (f) => <span className="font-medium text-text-primary">{f.name}</span> },
          { header: "Categoría", accessor: (f) => <Badge variant="default">{f.type}</Badge> },
          { header: "Tamaño", accessor: (f) => <span className="text-text-secondary">{f.size}</span> },
          { header: "Fecha", accessor: (f) => f.date },
          {
            header: "Estado",
            accessor: (f) => (
              <Badge variant={f.status === "active" ? "success" : "default"} dot>
                {f.status === "active" ? "Activo" : "Archivado"}
              </Badge>
            ),
          },
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
