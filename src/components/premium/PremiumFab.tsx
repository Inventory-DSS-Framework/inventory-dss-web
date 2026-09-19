"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit, Check, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useRole } from "@/hooks/useRole";

const PERKS = [
  "Pronóstico de todo tu catálogo",
  "Recomendaciones de compra automáticas",
  "Pronosticado vs. real y alertas de quiebre",
];

/**
 * Floating Premium entry point (bottom-right). On the free plan it breathes softly; hover
 * shows what Premium unlocks and a click opens the full-screen Premium presentation. On
 * Premium it becomes a quiet crown that leads to the plan's management view.
 */
export function PremiumFab() {
  const router = useRouter();
  const { isSeller } = useRole();
  const { isPremium, loading, subscription } = usePlan();
  if (isSeller || loading) return null;

  const renews = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="group fixed bottom-6 right-6 z-[90]">
      {/* Hover / focus card */}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full right-0 mb-3 w-[290px] translate-y-2 scale-[0.97] opacity-0 transition-all duration-300",
          "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
          "group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100",
        )}
      >
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-soft-xl">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-accent-violet/20 blur-2xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative">
            {isPremium ? (
              <>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-violet">
                  <Crown className="h-3.5 w-3.5" /> Premium activo
                </p>
                <p className="mt-2 font-display text-base font-semibold leading-snug text-text-primary">
                  El Motor FTGM completo trabaja para tu negocio
                </p>
                {renews && <p className="mt-1 text-xs text-text-secondary">Tu plan se renueva el {renews}.</p>}
                <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">
                  Ver mi plan <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-violet">
                  <Sparkles className="h-3.5 w-3.5" /> Hazte Premium
                </p>
                <p className="mt-2 font-display text-base font-semibold leading-snug text-text-primary">
                  Desbloquea el Motor FTGM para todo tu catálogo
                </p>
                <ul className="mt-3 space-y-1.5">
                  {PERKS.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-text-secondary">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-end justify-between border-t border-border-soft pt-3">
                  <p className="text-xs text-text-muted">
                    Desde <span className="font-display text-lg font-semibold text-text-primary">S/ 149</span>/mes
                  </p>
                  <p className="flex items-center gap-1 text-xs font-semibold text-primary">
                    Ver la presentación <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* The button */}
      <button
        type="button"
        onClick={() => router.push("/premium")}
        aria-label={isPremium ? "Ver mi plan Premium" : "Descubrir el plan Premium"}
        className={cn(
          "relative grid h-14 w-14 place-items-center rounded-2xl text-white transition-all duration-300",
          "bg-gradient-to-br from-primary to-accent-violet shadow-[0_12px_30px_-10px_rgb(var(--c-accent)/0.75)]",
          "hover:-translate-y-0.5 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-violet/30",
        )}
      >
        {!isPremium && (
          <>
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-2xl bg-accent-violet/35 motion-reduce:hidden"
              style={{ animationDuration: "2.8s" }}
            />
            <span className="absolute -right-1.5 -top-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-bold text-accent-violet shadow-soft ring-1 ring-accent-violet/25">
              PRO
            </span>
          </>
        )}
        {isPremium ? <Crown className="relative h-6 w-6" /> : <BrainCircuit className="relative h-6 w-6" />}
      </button>
    </div>
  );
}
