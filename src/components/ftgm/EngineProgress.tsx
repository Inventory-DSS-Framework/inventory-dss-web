"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Construyendo la historia desde tus ventas", detail: "Demanda diaria por producto, sin periodos incompletos." },
  { title: "Reparando demanda censurada", detail: "Días de quiebre y ventas perdidas en caja." },
  { title: "Limpiando valores atípicos", detail: "Filtro de Hampel sobre la serie desestacionalizada." },
  { title: "Eligiendo el orden de Fourier", detail: "Algoritmo 1: validación por RMSE." },
  { title: "Validando fuera de muestra", detail: "Rolling-origin frente al baseline estacional." },
  { title: "Proyectando demanda e intervalos", detail: "Pronóstico no negativo con banda del 90%." },
];

/** Animated engine steps while a run is pending/running; completes when `done`. */
export function EngineProgress({
  status,
  productCount,
  error,
}: {
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  productCount?: number;
  error?: string | null;
}) {
  const done = status === "success";
  const failed = status === "failed" || status === "cancelled";
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (done || failed) return;
    const t = setInterval(() => setActive((a) => Math.min(STEPS.length - 1, a + 1)), 1400);
    return () => clearInterval(t);
  }, [done, failed]);

  const current = done ? STEPS.length : active;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative grid h-14 w-14 shrink-0 place-items-center">
          <span
            className={cn(
              "absolute inset-0 rounded-2xl bg-accent-violet-soft",
              !done && !failed && "animate-pulse-glow",
            )}
          />
          <span className="absolute inset-1.5 rounded-xl border border-accent-violet/30 bg-surface" />
          {failed ? (
            <AlertTriangle className="relative h-6 w-6 text-danger" />
          ) : done ? (
            <Check className="relative h-6 w-6 text-accent-violet" />
          ) : (
            <Loader2 className="relative h-6 w-6 animate-spin text-accent-violet" />
          )}
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-text-primary">
            {failed ? "La ejecución no terminó" : done ? "Pronóstico listo" : "El motor FTGM está trabajando"}
          </p>
          <p className="text-sm text-text-secondary">
            {failed
              ? error || "Revisa el detalle e inténtalo de nuevo."
              : done
                ? "Abriendo el resultado…"
                : `${productCount ?? ""} producto(s) · ${status === "pending" ? "en cola" : "procesando"}`}
          </p>
        </div>
      </div>

      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const state = failed ? (i < current ? "done" : "idle") : i < current ? "done" : i === current ? "active" : "idle";
          return (
            <li
              key={s.title}
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all duration-500",
                state === "active" && "border-accent-violet/35 bg-accent-violet-soft/40",
                state === "done" && "border-border-soft bg-surface-soft/60",
                state === "idle" && "border-transparent opacity-50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  state === "done" && "bg-accent-violet text-surface",
                  state === "active" && "border-2 border-accent-violet text-accent-violet",
                  state === "idle" && "border border-border text-text-muted",
                )}
              >
                {state === "done" ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{s.title}</p>
                <p className="text-xs text-text-muted">{s.detail}</p>
              </div>
              {state === "active" && <Loader2 className="ml-auto mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent-violet" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
