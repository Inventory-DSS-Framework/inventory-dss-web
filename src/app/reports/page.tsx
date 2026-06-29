"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { ReportFormModal } from "@/components/reports/ReportFormModal";
import { FileText, Download, Loader2 } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { reportsApi } from "@/lib/api";
import { triggerDownload } from "@/lib/utils";
import type { ReportStatus, ReportType } from "@/types/api";

const typeLabel: Record<ReportType, string> = {
  forecast: "Pronóstico",
  kpi: "KPIs",
  recommendation: "Recomendaciones",
};
const statusLabel: Record<ReportStatus, string> = {
  pending: "Generando",
  ready: "Listo",
  failed: "Fallido",
};
const statusVariant: Record<ReportStatus, "default" | "success" | "warning" | "danger"> = {
  pending: "warning",
  ready: "success",
  failed: "danger",
};

export default function ReportsPage() {
  const companyId = useCompanyId();
  const reports = useApi(
    () => (companyId ? reportsApi.list(companyId) : Promise.resolve(null)),
    [companyId],
  );
  const items = reports.data?.items ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const download = async (id: string) => {
    if (!companyId) return;
    setDownloadingId(id);
    setActionError(null);
    try {
      const { blob, filename } = await reportsApi.download(companyId, id);
      triggerDownload(blob, filename);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo descargar el reporte");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Salida"
        title="Reportes"
        description="Genera reportes de pronósticos, KPIs y recomendaciones, y descárgalos cuando los necesites."
        action={
          <Button onClick={() => setFormOpen(true)} disabled={!companyId}>
            <FileText className="w-4 h-4" />
            Generar reporte
          </Button>
        }
      />

      {actionError && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      <DataState
        loading={reports.loading}
        error={reports.error}
        empty={items.length === 0}
        emptyMessage="Aún no has generado reportes. Crea el primero con “Generar reporte”."
        onRetry={reports.reload}
      >
        <Table
          title="Reportes generados"
          data={items}
          keyExtractor={(r) => r.id}
          columns={[
            { header: "Título", accessor: (r) => <span className="font-medium text-text-primary">{r.title}</span> },
            { header: "Tipo", accessor: (r) => <Badge variant="default">{typeLabel[r.report_type] ?? r.report_type}</Badge> },
            {
              header: "Estado",
              accessor: (r) => (
                <Badge variant={statusVariant[r.status] ?? "default"} dot>
                  {statusLabel[r.status] ?? r.status}
                </Badge>
              ),
            },
            {
              header: "",
              accessor: (r) =>
                r.status === "ready" ? (
                  <button
                    onClick={() => download(r.id)}
                    disabled={downloadingId === r.id}
                    className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover text-sm font-semibold disabled:opacity-50"
                  >
                    {downloadingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Descargar
                  </button>
                ) : (
                  <span className="text-xs text-text-muted">—</span>
                ),
            },
          ]}
        />
      </DataState>

      <ReportFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        companyId={companyId}
        onSaved={reports.reload}
      />
    </div>
  );
}
