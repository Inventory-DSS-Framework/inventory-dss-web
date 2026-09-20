"use client";

import { ArrowRight, Check, Minus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { BillingCycle, PlanDTO } from "@/types/billing";
import { fmtSoles, priceFor } from "./plan-data";

/** Monthly / yearly switch, in the app's own light chrome. */
function CycleToggle({ cycle, onChange, savings }: { cycle: BillingCycle; onChange: (c: BillingCycle) => void; savings: number }) {
  return (
    <div role="radiogroup" aria-label="Ciclo de facturación" className="relative inline-grid grid-cols-2 rounded-xl border border-border bg-surface-muted/70 p-1">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-surface shadow-soft transition-transform duration-500 [transition-timing-function:var(--ease-out)]"
        style={{ transform: cycle === "yearly" ? "translateX(100%)" : "none" }}
      />
      {(["monthly", "yearly"] as const).map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={cycle === c}
          onClick={() => onChange(c)}
          className={cn(
            "relative z-10 flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-colors",
            cycle === c ? "text-text-primary" : "text-text-muted hover:text-text-secondary",
          )}
        >
          {c === "monthly" ? "Mensual" : "Anual"}
          {c === "yearly" && savings > 0 && (
            <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">2 meses gratis</span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * The plans, plainly: two cards, the price, what each one includes and one button.
 * No scenes and no animation — the showcase now lives where the AI actually runs.
 */
export function PricingCards({
  plans,
  cycle,
  onCycle,
  onCheckout,
  isPremium = false,
}: {
  plans: PlanDTO[];
  cycle: BillingCycle;
  onCycle: (c: BillingCycle) => void;
  onCheckout: () => void;
  isPremium?: boolean;
}) {
  const free = plans.find((p) => p.id === "free");
  const premium = plans.find((p) => p.id === "premium");
  if (!free || !premium) return null;
  const price = priceFor(premium, cycle);
  const perMonth = cycle === "yearly" ? premium.price_yearly / 12 : premium.price_monthly;

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <CycleToggle cycle={cycle} onChange={onCycle} savings={premium.yearly_savings} />
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
        {/* Free */}
        <Card className="flex flex-col">
          <p className="font-display text-lg font-semibold text-text-primary">{free.name}</p>
          <p className="mt-1 text-sm text-text-secondary">{free.tagline}</p>
          <p className="mt-6 font-display text-4xl font-semibold text-text-primary">S/ 0</p>
          <p className="mt-1 text-xs text-text-muted">Para siempre</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {free.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-text-secondary">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" /> {f}
              </li>
            ))}
            {free.limits.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-text-muted">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 opacity-60" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-7">
            <div className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium text-text-muted">
              {isPremium ? "Plan básico" : "Tu plan actual"}
            </div>
          </div>
        </Card>

        {/* Premium */}
        <Card className="relative flex flex-col border-primary/30 shadow-soft-xl">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold text-text-primary">{premium.name}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-softer px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Recomendado
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{premium.tagline}</p>
          <div className="mt-6 flex items-end gap-2">
            <p key={cycle} className="font-display text-5xl font-semibold tracking-tight text-text-primary">{fmtSoles(price, 0)}</p>
            <p className="mb-1.5 text-sm text-text-muted">/ {cycle === "yearly" ? "año" : "mes"}</p>
          </div>
          <p className="mt-1 h-4 text-xs text-text-muted">
            {cycle === "yearly"
              ? `Equivale a ${fmtSoles(perMonth)} al mes · ahorras ${fmtSoles(premium.yearly_savings, 0)}`
              : "Sin permanencia · cancela cuando quieras"}
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {premium.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-text-secondary">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary-softer">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-7">
            {isPremium ? (
              <div className="rounded-xl border border-primary/30 bg-primary-softer px-4 py-2.5 text-center text-sm font-semibold text-primary">
                Tu plan actual
              </div>
            ) : (
              <button onClick={onCheckout} className="btn btn-primary group h-12 w-full gap-2 rounded-xl text-[15px]">
                Obtener Premium
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </Card>
      </div>

      <p className="text-center text-xs text-text-muted">Precios en soles con IGV incluido · Facturación a nombre de tu empresa.</p>
    </div>
  );
}
