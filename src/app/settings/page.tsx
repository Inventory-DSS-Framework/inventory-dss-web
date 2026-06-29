"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { authApi } from "@/lib/api";
import { logout } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const me = useApi(() => authApi.me(), []);

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Cuenta"
        title="Configuración"
        description="Datos de tu cuenta y sesión."
      />
      <DataState loading={me.loading} error={me.error} onRetry={me.reload}>
        {me.data && (
          <Card className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center text-primary">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">{me.data.full_name}</p>
                <p className="text-sm text-text-secondary">{me.data.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Rol</p>
                <Badge variant="primary">{me.data.role}</Badge>
              </div>
              <div>
                <p className="text-text-muted">Estado</p>
                <Badge variant="success">{me.data.status}</Badge>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted">Empresa (ID)</p>
                <p className="font-mono text-text-secondary">{me.data.company_id}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </Button>
            </div>
          </Card>
        )}
      </DataState>

      <Card className="space-y-4">
        <div>
          <h3 className="font-display font-semibold text-text-primary">Apariencia</h3>
          <p className="text-sm text-text-secondary mt-1">Elige el tema de color de la plataforma.</p>
        </div>
        <ThemeSwitcher />
      </Card>
    </div>
  );
}
