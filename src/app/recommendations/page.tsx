"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { CheckCircle, ShoppingCart, Sparkles } from "lucide-react";

export default function RecommendationsPage() {
  const recommendations = [
    { id: "REC-332", product: "Premium Dog Food 15kg", type: "Reabastecimiento", quantity: 150, reason: "Riesgo de stockout en 12 días (alta confianza FTGM)", priority: "critical", confidence: 94 },
    { id: "REC-333", product: "Cat Litter 10kg", type: "Reabastecimiento", quantity: 50, reason: "Cobertura por debajo del mínimo esperado", priority: "high", confidence: 87 },
    { id: "REC-334", product: "Anti-flea Collar Large", type: "Liquidación", quantity: 0, reason: "Rotación muy baja en los últimos 3 meses", priority: "medium", confidence: 76 },
  ];

  const accentBar: Record<string, string> = {
    critical: "before:bg-danger",
    high: "before:bg-warning",
    medium: "before:bg-primary",
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Inteligencia"
        title="Recomendaciones accionables"
        description="Sugerencias del sistema DSS basadas en el cruce de pronósticos y KPIs."
        action={
          <Button variant="secondary">
            <Sparkles className="w-4 h-4" />
            Regenerar
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec) => (
          <Card
            key={rec.id}
            interactive
            className={`relative flex flex-col h-full overflow-hidden before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${accentBar[rec.priority]}`}
          >
            <div className="flex justify-between items-start mb-4">
              <Badge variant={rec.priority === "critical" ? "danger" : rec.priority === "high" ? "warning" : "primary"} dot>
                {rec.priority === "critical" ? "Crítica" : rec.priority === "high" ? "Alta" : "Media"}
              </Badge>
              <span className="text-xs text-text-muted font-mono">{rec.id}</span>
            </div>

            <h3 className="font-semibold text-text-primary text-lg leading-snug">{rec.product}</h3>
            <p className="text-sm font-medium text-primary mt-0.5 mb-4">{rec.type}</p>

            <div className="bg-surface-soft rounded-2xl p-3.5 mb-4">
              <p className="text-sm text-text-secondary">{rec.reason}</p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-text-muted">Confianza del modelo</span>
              <span className="text-xs font-semibold text-text-primary">{rec.confidence}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden mb-4">
              <div className="h-full rounded-full bg-primary" style={{ width: `${rec.confidence}%` }} />
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2 text-text-primary">
                <ShoppingCart className="w-4 h-4 text-text-secondary" />
                <span className="font-semibold text-sm">Sugerido: {rec.quantity} uds.</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1">
                <CheckCircle className="w-4 h-4" />
                Aprobar
              </Button>
              <Button variant="secondary" className="flex-1">
                Descartar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
