"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { dataPreparationApi } from "@/lib/api";

export default function DataPreparationPage() {
  const companyId = useCompanyId();
  const datasets = useApi(
    () => (companyId ? dataPreparationApi.listDatasets(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = datasets.data ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Preparación de datos"
        description="Datasets limpios (agregación, outliers, stockout flags) listos para el motor."
      />
      <DataState
        loading={datasets.loading}
        error={datasets.error}
        empty={items.length === 0}
        emptyMessage="Aún no hay datasets preparados."
        onRetry={datasets.reload}
      >
        <Table
          title="Datasets preparados"
          data={items}
          keyExtractor={(d) => d.id}
          columns={[
            { header: "ID", accessor: (d) => <span className="font-mono text-text-secondary">{d.id.slice(0, 8)}</span> },
            { header: "Productos", accessor: (d) => d.product_count },
            { header: "Periodo", accessor: (d) => (d.period_start && d.period_end ? `${d.period_start} → ${d.period_end}` : "—") },
            { header: "Series", accessor: (d) => d.series.length },
            {
              header: "Estado",
              accessor: (d) => (
                <Badge variant={d.status === "ready" ? "success" : d.status === "failed" ? "danger" : "warning"} dot>
                  {d.status}
                </Badge>
              ),
            },
          ]}
        />
      </DataState>
    </div>
  );
}
