"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { useApi } from "@/hooks/useApi";
import { adminApi } from "@/lib/api";

export default function AdminPage() {
  const settings = useApi(() => adminApi.systemSettings(), []);
  const items = settings.data ?? [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Configuración del sistema"
        description="Ajustes globales de la plataforma (solo administradores)."
      />
      <DataState
        loading={settings.loading}
        error={settings.error}
        empty={items.length === 0}
        emptyMessage="No hay ajustes configurados."
        onRetry={settings.reload}
      >
        <Table
          title="System settings"
          data={items}
          keyExtractor={(s) => s.id}
          columns={[
            { header: "Clave", accessor: (s) => <span className="font-mono text-text-secondary">{s.key}</span> },
            { header: "Valor", accessor: (s) => <span className="text-text-primary">{JSON.stringify(s.value)}</span> },
            { header: "Actualizado", accessor: (s) => s.updated_at.slice(0, 16).replace("T", " ") },
          ]}
        />
      </DataState>
    </div>
  );
}
