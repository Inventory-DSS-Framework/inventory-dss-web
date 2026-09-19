"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { AppearanceSettings } from "@/components/experience/AppearanceSettings";
import { PlanBillingCard } from "@/components/settings/PlanBillingCard";
import { HelpTourCard } from "@/components/settings/HelpTourCard";
import { LogOut, User, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { authApi, companiesApi } from "@/lib/api";
import { logout } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const me = useApi(() => authApi.me(), []);
  const company = useApi(
    () => (companyId ? companiesApi.get(companyId) : Promise.resolve(null)),
    [companyId],
  );

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

      {company.data && (
        <Card className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-violet-soft flex items-center justify-center text-accent-violet">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">{company.data.name}</p>
              <p className="text-sm text-text-secondary capitalize">
                {company.data.business_type || "Empresa"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="primary">{company.data.plan}</Badge>
              <Badge variant={company.data.status === "active" ? "success" : "default"} dot>
                {company.data.status}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {company.data.email && (
              <div><p className="text-text-muted">Correo</p><p className="text-text-primary">{company.data.email}</p></div>
            )}
            {company.data.phone && (
              <div><p className="text-text-muted">Teléfono</p><p className="text-text-primary">{company.data.phone}</p></div>
            )}
            {company.data.tax_id && (
              <div><p className="text-text-muted">RUC / Tax ID</p><p className="text-text-primary font-mono">{company.data.tax_id}</p></div>
            )}
            {company.data.address && (
              <div className="col-span-2"><p className="text-text-muted">Dirección</p><p className="text-text-primary">{company.data.address}</p></div>
            )}
          </div>
        </Card>
      )}

      <PlanBillingCard />

      <AppearanceSettings />

      <HelpTourCard />
    </div>
  );
}
