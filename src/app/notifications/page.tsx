"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bell, AlertTriangle, Info } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { notificationsApi } from "@/lib/api";

export default function NotificationsPage() {
  const companyId = useCompanyId();
  const notifs = useApi(
    () => (companyId ? notificationsApi.list(companyId) : Promise.resolve(null)),
    [companyId],
  );
  const items = notifs.data?.items ?? [];

  const markRead = async (id: string) => {
    if (!companyId) return;
    try {
      await notificationsApi.markRead(companyId, id);
      notifs.reload();
    } catch {
      /* surfaced on next load */
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <PageHeader
        title="Avisos"
        description="Te avisamos aquí cuando algo necesita tu atención, como productos que se están acabando."
      />
      <DataState
        loading={notifs.loading}
        error={notifs.error}
        empty={items.length === 0}
        emptyState={
          <EmptyState
            icon={Bell}
            title="No tienes avisos"
            description="Todo en orden. Cuando un producto se esté acabando o pase algo importante, lo verás aquí."
            action={{ label: "Ver mi inventario", href: "/inventory" }}
          />
        }
        onRetry={notifs.reload}
      >
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl shrink-0 ${n.severity === "critical" ? "bg-danger-soft text-danger" : n.severity === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary"}`}>
                {n.severity === "critical" ? <AlertTriangle className="w-5 h-5" /> : n.severity === "warning" ? <Bell className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-text-primary">{n.title}</h3>
                  {!n.is_read && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="primary" dot>Nuevo</Badge>
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs font-medium text-text-muted hover:text-primary transition-colors"
                      >
                        Ya lo vi
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-text-secondary mt-1">{n.message}</p>
                <p className="text-xs text-text-muted mt-2">
                  {new Date(n.created_at).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </DataState>
    </div>
  );
}
