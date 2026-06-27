"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { filesApi } from "@/lib/api";

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const companyId = useCompanyId();
  const files = useApi(
    () => (companyId ? filesApi.list(companyId) : Promise.resolve(null)),
    [companyId],
  );
  const items = files.data?.items ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Salida"
        title="Archivos"
        description="Archivos almacenados: cargas originales, datasets y reportes."
      />
      <DataState
        loading={files.loading}
        error={files.error}
        empty={items.length === 0}
        emptyMessage="No hay archivos almacenados."
        onRetry={files.reload}
      >
        <Table
          title="Archivos"
          data={items}
          keyExtractor={(f) => f.id}
          columns={[
            { header: "Nombre", accessor: (f) => <span className="font-medium text-text-primary">{f.file_name}</span> },
            { header: "Categoría", accessor: (f) => <Badge variant="default">{f.category}</Badge> },
            { header: "Tipo", accessor: (f) => <span className="text-text-secondary">{f.content_type}</span> },
            { header: "Tamaño", accessor: (f) => humanSize(f.size_bytes) },
          ]}
        />
      </DataState>
    </div>
  );
}
