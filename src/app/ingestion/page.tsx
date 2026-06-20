"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { UploadCloud, CheckCircle, FileSpreadsheet } from "lucide-react";

export default function IngestionPage() {
  const recent = [
    { name: "historico_ventas_2025.csv", date: "Hace 2 horas", rows: "15.420 filas", status: "Procesado" },
    { name: "inventario_corte_mayo.xlsx", date: "Ayer", rows: "8.200 filas", status: "Procesado" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Ingesta de datos"
        description="Sube tus archivos CSV/Excel de ventas e inventario histórico para alimentar el modelo."
      />

      <Card className="border-dashed border-2 border-primary/25 bg-primary-softer/60 hover:bg-primary-soft/50 transition-colors cursor-pointer flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
          <UploadCloud className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-1.5">Arrastra tu archivo aquí</h3>
        <p className="text-text-secondary mb-6 max-w-sm text-sm">
          Soporta CSV, XLS y XLSX hasta 50 MB. Asegúrate de incluir las columnas requeridas.
        </p>
        <Button>Seleccionar archivo</Button>
      </Card>

      <div>
        <h3 className="text-base font-semibold text-text-primary mb-3">Cargas recientes</h3>
        <div className="space-y-3">
          {recent.map((file, i) => (
            <Card key={i} interactive className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-success-soft flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-text-primary text-sm">{file.name}</p>
                  <p className="text-xs text-text-muted">{file.date} · {file.rows}</p>
                </div>
              </div>
              <Badge variant="success" dot>
                <CheckCircle className="w-3.5 h-3.5" />
                {file.status}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
