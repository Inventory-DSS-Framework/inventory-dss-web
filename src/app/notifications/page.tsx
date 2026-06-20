"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";

export default function NotificationsPage() {
  const notifications = [
    { id: "NOT-112", title: "Quiebre de stock detectado", message: "Cat Litter 10kg está bajo el mínimo esperado.", date: "Hace 10 min", status: "unread", type: "alert" },
    { id: "NOT-111", title: "Forecast completado", message: "La corrida FCT-991 ha finalizado exitosamente.", date: "Hace 2 horas", status: "read", type: "info" },
    { id: "NOT-110", title: "Nuevo reporte", message: "El reporte de KPIs de Mayo está listo.", date: "Ayer", status: "read", type: "info" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Salida"
        title="Notificaciones"
        description="Alertas del sistema, eventos y avisos importantes."
      />
      <Table
        title="Bandeja de notificaciones"
        data={notifications}
        keyExtractor={(n) => n.id}
        columns={[
          {
            header: "",
            className: "w-8",
            accessor: (n) => <div className={`w-2 h-2 rounded-full ${n.status === "unread" ? "bg-primary" : "bg-border"}`} />,
          },
          {
            header: "Notificación",
            accessor: (n) => (
              <div>
                <p className="font-medium text-text-primary">{n.title}</p>
                <p className="text-sm text-text-secondary">{n.message}</p>
              </div>
            ),
          },
          {
            header: "Tipo",
            accessor: (n) => (
              <Badge variant={n.type === "alert" ? "danger" : "primary"} dot>
                {n.type === "alert" ? "Alerta" : "Info"}
              </Badge>
            ),
          },
          { header: "Fecha", accessor: (n) => <span className="text-text-secondary">{n.date}</span> },
        ]}
      />
    </div>
  );
}
