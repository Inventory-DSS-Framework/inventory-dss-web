"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { reportsApi } from "@/lib/api";

export default function ReportsPage() {
  const companyId = useCompanyId();
  const reports = useApi(
    () => (companyId ? reportsApi.list(companyId) : Promise.resolve(null)),
    [companyId],
  );
  const items = reports.data?.items ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Salida"
        title="Reportes"
        description="Reportes de pronósticos, KPIs y recomendaciones."
      />
      <DataState
        loading={reports.loading}
        error={reports.error}
        empty={items.length === 0}
        emptyMessage="No hay reportes generados."
        onRetry={reports.reload}
      >
        <Table
          title="Reportes"
          data={items}
          keyExtractor={(r) => r.id}
          columns={[
            { header: "Título", accessor: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
            { header: "Tipo", accessor: (r) => <Badge variant="default">{r.report_type}</Badge> },
            {
              header: "Estado",
              accessor: (r) => (
                <Badge variant={r.status === "ready" ? "success" : r.status === "failed" ? "danger" : "warning"} dot>
                  {r.status}
                </Badge>
              ),
            },
          ]}
        />
      </DataState>
    </div>
  );
}
