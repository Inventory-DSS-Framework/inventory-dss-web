"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { validationApi } from "@/lib/api";

const ruleTypeLabel: Record<string, string> = {
  missing_value: "Valores faltantes",
  outlier: "Valores atípicos",
  format: "Formato",
};

// Recommended defaults, one per rule type, seeded on demand.
const DEFAULT_RULES = [
  { rule_name: "Sin fechas ni cantidades vacías", rule_type: "missing_value" },
  { rule_name: "Detección de ventas atípicas (outliers)", rule_type: "outlier" },
  { rule_name: "Formato de fecha y SKU válido", rule_type: "format" },
];

export default function ValidationPage() {
  const companyId = useCompanyId();
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const rules = useApi(
    () => (companyId ? validationApi.listRules(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = rules.data ?? [];

  const seedDefaults = async () => {
    if (!companyId) return;
    setWorking(true);
    setActionError(null);
    try {
      for (const r of DEFAULT_RULES) {
        await validationApi.createRule(companyId, { ...r, is_active: true });
      }
      rules.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudieron crear las reglas");
    } finally {
      setWorking(false);
    }
  };

  const toggle = async (ruleId: string, next: boolean) => {
    if (!companyId) return;
    setActionError(null);
    try {
      await validationApi.updateRule(companyId, ruleId, { is_active: next });
      rules.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo actualizar la regla");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Validación"
        description="Reglas de calidad de datos aplicadas a tus cargas de ventas."
        action={
          items.length > 0 ? (
            <Button variant="secondary" onClick={seedDefaults} disabled={working}>
              <ShieldCheck className="w-4 h-4" />
              {working ? "Creando…" : "Añadir recomendadas"}
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      <DataState
        loading={rules.loading}
        error={rules.error}
        empty={items.length === 0}
        onRetry={rules.reload}
        emptyState={
          <EmptyState
            icon={ShieldCheck}
            title="Aún no hay reglas de validación"
            description="Las reglas verifican la calidad de tus datos de ventas (valores faltantes, atípicos y formato). Crea el conjunto recomendado para empezar."
            action={{ label: working ? "Creando…" : "Crear reglas recomendadas", onClick: seedDefaults }}
          />
        }
      >
        <Table
          title="Reglas de validación"
          data={items}
          keyExtractor={(r) => r.id}
          columns={[
            { header: "Regla", accessor: (r) => <span className="font-medium text-text-primary">{r.rule_name}</span> },
            { header: "Tipo", accessor: (r) => <Badge variant="default">{ruleTypeLabel[r.rule_type] ?? r.rule_type}</Badge> },
            {
              header: "Estado",
              accessor: (r) => (
                <button
                  onClick={() => toggle(r.id, !r.is_active)}
                  className="inline-flex items-center gap-2"
                  title={r.is_active ? "Desactivar" : "Activar"}
                >
                  <span
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors",
                      r.is_active ? "bg-success" : "bg-surface-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                        r.is_active ? "left-[18px]" : "left-0.5",
                      )}
                    />
                  </span>
                  <span className={cn("text-xs font-medium", r.is_active ? "text-success" : "text-text-muted")}>
                    {r.is_active ? "Activa" : "Inactiva"}
                  </span>
                </button>
              ),
            },
          ]}
        />
      </DataState>
    </div>
  );
}
