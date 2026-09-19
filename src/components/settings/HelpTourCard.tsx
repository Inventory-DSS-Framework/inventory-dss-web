"use client";

import { useRouter } from "next/navigation";
import { Compass, MousePointerClick, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { startGuidedTour } from "@/lib/onboarding";

/** Ajustes › Ayuda: replay the welcome flow or the in-app guided tour. */
export function HelpTourCard() {
  const router = useRouter();
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-violet-soft text-accent-violet">
          <Compass className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-text-primary">Aprende a usar InventoryDSS</p>
          <p className="text-sm text-text-secondary">Vuelve a ver la bienvenida o haz el recorrido guiado cuando quieras.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push("/welcome?replay=1")}
          className="group flex items-start gap-3 rounded-2xl border border-border bg-surface-soft/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-surface"
        >
          <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="block text-sm font-semibold text-text-primary">Bienvenida y demo</span>
            <span className="block text-xs text-text-secondary">Configura columnas, primera carga y mira cómo funciona todo.</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            startGuidedTour();
            router.push("/dashboard");
          }}
          className="group flex items-start gap-3 rounded-2xl border border-border bg-surface-soft/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-surface"
        >
          <MousePointerClick className="mt-0.5 h-5 w-5 shrink-0 text-accent-violet" />
          <span>
            <span className="block text-sm font-semibold text-text-primary">Recorrido guiado</span>
            <span className="block text-xs text-text-secondary">Te señalamos dónde está cada opción sobre la app real.</span>
          </span>
        </button>
      </div>
    </Card>
  );
}
