"use client";

import { useState } from "react";
import { BarChart2, Download, FileText, Lightbulb, Loader2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportFormModal } from "@/components/reports/ReportFormModal";
import { PanelHeading } from "./PanelHeading";
import { useApi } from "@/hooks/useApi";
import { reportsApi } from "@/lib/api";
import { triggerDownload } from "@/lib/utils";
import type { ReportStatus, ReportType } from "@/types/api";

const typeMeta: Record<ReportType, { label: string; todo: string; icon: typeof TrendingUp }> = {
  forecast: { label: "Cuánto venderé", todo: "Úsalo para planificar tus compras.", icon: TrendingUp },
  kpi: { label: "Mis números", todo: "Revisa qué productos se pueden acabar.", icon: BarChart2 },
  recommendation: { label: "Qué comprar", todo: "Llévalo a tu proveedor al hacer tu pedido.", icon: Lightbulb },
};
const statusMeta: Record<ReportStatus, { label: string; tone: "warning" | "success" | "danger" }> = {
  pending: { label: "Generando", tone: "warning" },
  ready: { label: "Listo", tone: "success" },
  failed: { label: "No se pudo generar", tone: "danger" },
};

/** "Reportes": the same results in a file you can download or take to your supplier. */
export function ReportsPanel({ companyId }: { companyId: string | null }) {
  const reports = useApi(() => (companyId ? reportsApi.list(companyId) : Promise.resolve(null)), [companyId]);
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
    <div className="space-y-5">
      <PanelHeading
        title="Reportes"
        description="Descarga en un archivo cuánto venderás, tus números y la lista de qué comprar, para revisarlos o compartirlos."
        action={
          <Button variant="violet" onClick={() => setFormOpen(true)} disabled={!companyId}>
            <FileText className="h-4 w-4" /> Generar reporte
          </Button>
        }
      />

      {actionError && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{actionError}</div>}

      <DataState
        loading={reports.loading}
        error={reports.error}
        empty={items.length === 0}
        onRetry={reports.reload}
        emptyState={
          <EmptyState
            icon={FileText}
            title="Aún no has generado reportes"
            description="Crea tu primer reporte: se arma al instante con tus datos y queda listo para descargar."
            action={{ label: "Generar reporte", onClick: () => setFormOpen(true) }}
          />
        }
      >
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-display text-[15px] font-semibold text-text-primary">Tus reportes</h3>
          </div>
          <div className="divide-y divide-border-soft">
            {items.map((r) => {
              const t = typeMeta[r.report_type] ?? typeMeta.forecast;
              const s = statusMeta[r.status] ?? statusMeta.pending;
              const Icon = t.icon;
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-violet-soft text-accent-violet">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{r.title}</p>
                    <p className="text-xs text-text-muted">
                      {t.label} · <span className="text-text-secondary">{t.todo}</span>
                    </p>
                  </div>
                  <Badge variant={s.tone} dot>
                    {s.label}
                  </Badge>
                  {r.status === "ready" ? (
                    <Button variant="secondary" size="sm" onClick={() => download(r.id)} disabled={downloadingId === r.id}>
                      {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Descargar
                    </Button>
                  ) : (
                    <span className="w-[104px]" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </DataState>

      <ReportFormModal open={formOpen} onClose={() => setFormOpen(false)} companyId={companyId} onSaved={reports.reload} />
    </div>
  );
}
