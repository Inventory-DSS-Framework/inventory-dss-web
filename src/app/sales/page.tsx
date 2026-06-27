"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { salesApi } from "@/lib/api";

export default function SalesPage() {
  const companyId = useCompanyId();
  const sales = useApi(
    () => (companyId ? salesApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = sales.data ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Ventas observadas"
        description="Historial de ventas utilizado para el análisis de demanda."
      />
      <DataState
        loading={sales.loading}
        error={sales.error}
        empty={items.length === 0}
        emptyMessage="Aún no hay ventas registradas."
        onRetry={sales.reload}
      >
        <Table
          title="Ventas recientes"
          data={items}
          keyExtractor={(s) => s.id}
          columns={[
            { header: "ID", accessor: (s) => <span className="font-mono text-text-secondary">{s.id.slice(0, 8)}</span> },
            { header: "Fecha", accessor: (s) => s.sale_date },
            { header: "Producto", accessor: (s) => <span className="font-mono text-text-secondary">{s.product_id.slice(0, 8)}</span> },
            { header: "Cantidad", accessor: (s) => s.quantity },
            { header: "Precio unit.", accessor: (s) => `S/ ${Number(s.unit_price).toFixed(2)}` },
            { header: "Total", accessor: (s) => <span className="font-semibold text-text-primary">S/ {Number(s.total_amount).toFixed(2)}</span> },
            { header: "Lote", accessor: (s) => (s.batch_id ? <Badge variant="violet">batch</Badge> : <span className="text-text-muted">—</span>) },
          ]}
        />
      </DataState>
    </div>
  );
}
