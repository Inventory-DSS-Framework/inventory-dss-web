"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full bg-surface-soft border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-surface focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Configuración"
        description="Ajustes de la empresa, parámetros del modelo y gestión de usuarios."
      />
      <Card>
        <h3 className="text-base font-semibold text-text-primary mb-6">Detalles de la empresa</h3>
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Nombre de la empresa</label>
              <input type="text" defaultValue="Unidad Petshop 1" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Rubro</label>
              <input type="text" defaultValue="Retail Veterinaria" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Moneda</label>
              <select className={inputClass}>
                <option>PEN (S/)</option>
                <option>USD ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Frecuencia de forecast</label>
              <select className={inputClass}>
                <option>Mensual</option>
                <option>Semanal</option>
                <option>Diario</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-border">
            <div className="pt-4">
              <Button type="button">Guardar cambios</Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
