"use client";

import { useRef, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { IngestionDetailModal } from "@/components/ingestion/IngestionDetailModal";
import { UploadCloud } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { ingestionApi } from "@/lib/api";
import type { IngestionBatchDTO } from "@/types/api";

const STATUS_VARIANT: Record<string, "default" | "warning" | "success" | "danger"> = {
  uploaded:   "default",
  mapping:    "warning",
  validating: "warning",
  validated:  "success",
  failed:     "danger",
};

const STATUS_LABEL: Record<string, string> = {
  uploaded:   "Subido",
  mapping:    "Mapeando",
  validating: "Validando",
  validated:  "Validado",
  failed:     "Fallido",
};

export default function IngestionPage() {
  const companyId = useCompanyId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IngestionBatchDTO | null>(null);

  const uploads = useApi(
    () => (companyId ? ingestionApi.listUploads(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = uploads.data ?? [];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setWorking(true);
    setActionError(null);
    try {
      await ingestionApi.upload(companyId, file);
      uploads.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo subir el archivo");
    } finally {
      setWorking(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleUpdated = useCallback((updated: IngestionBatchDTO) => {
    setSelected(updated);
    uploads.reload();
  }, [uploads]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Ingesta de datos"
        description="Carga archivos CSV/Excel de ventas para alimentar el pipeline."
        action={
          <>
            <input ref={fileInput} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileInput.current?.click()} disabled={working || !companyId}>
              <UploadCloud className="w-4 h-4" />
              {working ? "Subiendo…" : "Subir archivo"}
            </Button>
          </>
        }
      />

      {actionError && (
        <div className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      <DataState
        loading={uploads.loading}
        error={uploads.error}
        empty={items.length === 0}
        emptyMessage="Aún no se han cargado archivos."
        onRetry={uploads.reload}
      >
        <Table
          title="Cargas recientes"
          data={items}
          keyExtractor={(u) => u.id}
          onRowClick={companyId ? (u) => setSelected(u) : undefined}
          columns={[
            {
              header: "Archivo",
              accessor: (u) => <span className="font-medium text-text-primary">{u.file_name}</span>,
            },
            {
              header: "Tipo",
              accessor: (u) => <Badge variant="default">{u.file_type.toUpperCase()}</Badge>,
            },
            { header: "Filas", accessor: (u) => u.row_count },
            {
              header: "Errores",
              accessor: (u) => (
                <span className={u.error_count ? "text-danger font-medium" : "text-text-secondary"}>
                  {u.error_count}
                </span>
              ),
            },
            {
              header: "Estado",
              accessor: (u) => (
                <Badge variant={STATUS_VARIANT[u.status] ?? "default"} dot>
                  {STATUS_LABEL[u.status] ?? u.status}
                </Badge>
              ),
            },
            {
              header: "",
              accessor: () => (
                <span className="text-xs text-primary font-medium">Abrir →</span>
              ),
            },
          ]}
        />
      </DataState>

      {companyId && (
        <IngestionDetailModal
          batch={selected}
          companyId={companyId}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
