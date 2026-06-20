"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { UserPlus } from "lucide-react";

export default function AdminPage() {
  const users = [
    { id: "USR-001", name: "Gabriel", role: "Super Admin", status: "active" },
    { id: "USR-002", name: "Dylan", role: "Super Admin", status: "active" },
    { id: "USR-003", name: "Gerente MYPE", role: "Company Admin", status: "active" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Administración global"
        description="Gestión global del sistema SaaS (solo Super Admins)."
        action={
          <Button>
            <UserPlus className="w-4 h-4" />
            Invitar usuario
          </Button>
        }
      />
      <Table
        title="Usuarios del sistema"
        data={users}
        keyExtractor={(u) => u.id}
        columns={[
          { header: "ID usuario", accessor: (u) => <span className="font-mono text-text-secondary">{u.id}</span> },
          {
            header: "Nombre",
            accessor: (u) => (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-accent-violet-soft flex items-center justify-center text-xs font-bold text-accent-violet">
                  {u.name.charAt(0)}
                </div>
                <span className="font-medium text-text-primary">{u.name}</span>
              </div>
            ),
          },
          { header: "Rol global", accessor: (u) => <Badge variant={u.role === "Super Admin" ? "violet" : "primary"}>{u.role}</Badge> },
          {
            header: "Estado",
            accessor: (u) => (
              <Badge variant={u.status === "active" ? "success" : "danger"} dot>
                {u.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
