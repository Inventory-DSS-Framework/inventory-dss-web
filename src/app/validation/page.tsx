"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { CircularGauge } from "@/components/ui/CircularGauge";
import { CheckCircle, Info, ThumbsUp, ThumbsDown } from "lucide-react";

export default function ValidationPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Inteligencia"
        title="Validación del modelo"
        description="Seguimiento de la aceptación de las recomendaciones por parte de los usuarios (feedback loop)."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-5">
          <CircularGauge value={85} size={104} strokeWidth={10} label="85%" color="#10B981" trackColor="#D6F5E7" />
          <div>
            <h3 className="text-sm font-medium text-text-secondary">Tasa de aceptación</h3>
            <p className="text-xs text-text-muted mt-1">Últimas 100 recomendaciones</p>
            <span className="mt-2 inline-flex items-center gap-1 text-success text-sm font-semibold">
              <CheckCircle className="w-4 h-4" /> Saludable
            </span>
          </div>
        </Card>

        <Card interactive className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-1">Sugerencias aceptadas</h3>
            <p className="text-3xl font-bold tracking-tight text-text-primary">1,245</p>
          </div>
          <div className="p-3 rounded-xl bg-success-soft text-success">
            <ThumbsUp className="w-5 h-5" />
          </div>
        </Card>

        <Card interactive className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-1">Sugerencias descartadas</h3>
            <p className="text-3xl font-bold tracking-tight text-text-primary">212</p>
          </div>
          <div className="p-3 rounded-xl bg-danger-soft text-danger">
            <ThumbsDown className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <Card className="flex items-start gap-4">
        <div className="bg-primary-soft p-3 rounded-2xl shrink-0">
          <Info className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text-primary mb-1.5">¿Cómo funciona la validación?</h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            Cada vez que un usuario aprueba o descarta una recomendación de reposición, el sistema lo registra.
            Este feedback se utiliza para evaluar la utilidad real del modelo FTGM en el entorno productivo de la MYPE,
            siendo un factor clave para el análisis de éxito de la plataforma.
          </p>
        </div>
      </Card>
    </div>
  );
}
