"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { UploadCloud } from "lucide-react";

export default function SalesPage() {
  const sales = [
    { id: "TRX-1029", date: "2026-06-20", items: 3, total: 150.5, channel: "POS Tienda" },
    { id: "TRX-1028", date: "2026-06-19", items: 1, total: 45.0, channel: "E-commerce" },
    { id: "TRX-1027", date: "2026-06-18", items: 5, total: 320.0, channel: "POS Tienda" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Ventas observadas"
        description="Historial de ventas utilizado para el análisis de demanda."
        action={
          <Button variant="secondary">
            <UploadCloud className="w-4 h-4" />
            Cargar batch
          </Button>
        }
      />
      <Table
        title="Transacciones recientes"
        data={sales}
        keyExtractor={(s) => s.id}
        columns={[
          { header: "Transacción", accessor: (s) => <span className="font-mono text-text-secondary">{s.id}</span> },
          { header: "Fecha", accessor: (s) => s.date },
          { header: "Artículos", accessor: (s) => s.items },
          { header: "Total", accessor: (s) => <span className="font-semibold text-text-primary">S/ {s.total.toFixed(2)}</span> },
          { header: "Canal", accessor: (s) => <Badge variant={s.channel === "E-commerce" ? "violet" : "default"}>{s.channel}</Badge> },
        ]}
      />
    </div>
  );
}
