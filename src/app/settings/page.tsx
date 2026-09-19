"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { AppearanceSettings } from "@/components/experience/AppearanceSettings";
import { PlanBillingCard } from "@/components/settings/PlanBillingCard";
import { HelpTourCard } from "@/components/settings/HelpTourCard";
import { LogOut, User, Building2, Wrench } from "lucide-react";
import { useExpertMode } from "@/hooks/useExpertMode";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dueño",
  admin: "Administrador",
  seller: "Vendedor",
  analyst: "Analista",
  viewer: "Solo lectura",
};
const STATUS_LABEL: Record<string, string> = { active: "Activo", inactive: "Inactivo", suspended: "Suspendido" };
const PLAN_LABEL: Record<string, string> = { free: "Gratis", basic: "Básico", premium: "Premium", pro: "Pro" };
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { authApi, companiesApi } from "@/lib/api";
import { logout } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const [expert, setExpert] = useExpertMode();
  const me = useApi(() => authApi.me(), []);
  const company = useApi(
    () => (companyId ? companiesApi.get(companyId) : Promise.resolve(null)),
    [companyId],
  );

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <PageHeader
        title="Ajustes"
        description="Tu cuenta, tu negocio y cómo quieres ver la plataforma."
      />

      <Card className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-muted text-text-secondary">
            <Wrench className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text-primary">Modo experto</p>
            <p className="text-sm text-text-secondary">
              Muestra detalles técnicos (métricas, códigos internos). Déjalo apagado si solo quieres lo esencial.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={expert}
            aria-label="Modo experto"
            onClick={() => setExpert(!expert)}
            className={cn(
              "relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors",
              expert ? "bg-primary" : "bg-surface-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-soft transition-all",
                expert ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </div>
        <p className="text-xs text-text-muted">
          {expert ? "Encendido: verás códigos, costos detallados y columnas extra." : "Apagado: solo ves lo esencial."} Solo cambia lo que ves en este navegador.
        </p>
      </Card>
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
                <p className="text-text-muted">Tu rol</p>
                <Badge variant="primary">{ROLE_LABEL[me.data.role] ?? me.data.role}</Badge>
              </div>
              <div>
                <p className="text-text-muted">Cuenta</p>
                <Badge variant="success">{STATUS_LABEL[me.data.status] ?? me.data.status}</Badge>
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
                {company.data.business_type || "Mi negocio"}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="primary">{PLAN_LABEL[company.data.plan] ?? company.data.plan}</Badge>
              <Badge variant={company.data.status === "active" ? "success" : "default"} dot>
                {STATUS_LABEL[company.data.status] ?? company.data.status}
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
              <div><p className="text-text-muted">RUC</p><p className="text-text-primary font-mono">{company.data.tax_id}</p></div>
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
