"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";

export default function InventoryPage() {
  const movements = [
    { id: "MOV-501", date: "2026-06-20", product: "Premium Dog Food 15kg", type: "IN", quantity: 50, reason: "Recepción OC-902" },
    { id: "MOV-500", date: "2026-06-19", product: "Cat Litter 10kg", type: "OUT", quantity: -2, reason: "Venta TRX-1029" },
    { id: "MOV-499", date: "2026-06-18", product: "Anti-flea Collar Large", type: "ADJ", quantity: -1, reason: "Mermas / dañado" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Inventario"
        description="Visualiza los movimientos recientes y el estado del stock."
      />
      <Table
        title="Movimientos de inventario"
        data={movements}
        keyExtractor={(m) => m.id}
        columns={[
          { header: "ID", accessor: (m) => <span className="font-mono text-text-secondary">{m.id}</span> },
          { header: "Fecha", accessor: (m) => m.date },
          { header: "Producto", accessor: (m) => <span className="font-medium text-text-primary">{m.product}</span> },
          {
            header: "Tipo",
            accessor: (m) => (
              <Badge variant={m.type === "IN" ? "success" : m.type === "OUT" ? "primary" : "warning"} dot>
                {m.type === "IN" ? "Entrada" : m.type === "OUT" ? "Salida" : "Ajuste"}
              </Badge>
            ),
          },
          {
            header: "Cantidad",
            accessor: (m) => (
              <span className={m.quantity > 0 ? "font-semibold text-success" : "font-semibold text-danger"}>
                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
              </span>
            ),
          },
          { header: "Motivo", accessor: (m) => <span className="text-text-secondary">{m.reason}</span> },
        ]}
      />
    </div>
  );
}
