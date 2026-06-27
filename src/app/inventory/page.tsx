"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { inventoryApi } from "@/lib/api";

const typeLabel: Record<string, string> = {
  inbound: "Entrada",
  outbound: "Salida",
  adjustment: "Ajuste",
};

export default function InventoryPage() {
  const companyId = useCompanyId();
  const movements = useApi(
    () => (companyId ? inventoryApi.listMovements(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = movements.data ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Inventario"
        description="Movimientos recientes; el stock actual se deriva de este libro."
      />
      <DataState
        loading={movements.loading}
        error={movements.error}
        empty={items.length === 0}
        emptyMessage="Aún no hay movimientos de inventario."
        onRetry={movements.reload}
      >
        <Table
          title="Movimientos de inventario"
          data={items}
          keyExtractor={(m) => m.id}
          columns={[
            { header: "ID", accessor: (m) => <span className="font-mono text-text-secondary">{m.id.slice(0, 8)}</span> },
            { header: "Fecha", accessor: (m) => m.occurred_at.slice(0, 10) },
            { header: "Producto", accessor: (m) => <span className="font-mono text-text-secondary">{m.product_id.slice(0, 8)}</span> },
            {
              header: "Tipo",
              accessor: (m) => (
                <Badge variant={m.movement_type === "inbound" ? "success" : m.movement_type === "outbound" ? "primary" : "warning"} dot>
                  {typeLabel[m.movement_type] ?? m.movement_type}
                </Badge>
              ),
            },
            {
              header: "Cantidad",
              accessor: (m) => (
                <span className={m.movement_type === "outbound" ? "font-semibold text-danger" : "font-semibold text-success"}>
                  {m.movement_type === "outbound" ? "-" : "+"}
                  {m.quantity}
                </span>
              ),
            },
            { header: "Motivo", accessor: (m) => <span className="text-text-secondary">{m.reason || "—"}</span> },
          ]}
        />
      </DataState>
    </div>
  );
}
