"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { validationApi } from "@/lib/api";

export default function ValidationPage() {
  const companyId = useCompanyId();
  const rules = useApi(
    () => (companyId ? validationApi.listRules(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = rules.data ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Salida"
        title="Validación"
        description="Reglas de calidad de datos aplicadas a las cargas."
      />
      <DataState
        loading={rules.loading}
        error={rules.error}
        empty={items.length === 0}
        emptyMessage="No hay reglas de validación configuradas."
        onRetry={rules.reload}
      >
        <Table
          title="Reglas de validación"
          data={items}
          keyExtractor={(r) => r.id}
          columns={[
            { header: "Regla", accessor: (r) => <span className="font-medium text-text-primary">{r.rule_name}</span> },
            { header: "Tipo", accessor: (r) => <Badge variant="default">{r.rule_type}</Badge> },
            {
              header: "Estado",
              accessor: (r) => (
                <Badge variant={r.is_active ? "success" : "default"} dot>
                  {r.is_active ? "Activa" : "Inactiva"}
                </Badge>
              ),
            },
          ]}
        />
      </DataState>
    </div>
  );
}
