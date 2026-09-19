"use client";

import { ArrowRight, Check, Minus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingCycle, PlanDTO } from "@/types/billing";
import { fmtSoles, priceFor } from "./plan-data";

type Style = React.CSSProperties & Record<`--${string}`, string>;
const d = (s: number): Style => ({ "--d": `${s}s` });

export function CycleToggle({ cycle, onChange, savings }: { cycle: BillingCycle; onChange: (c: BillingCycle) => void; savings: number }) {
  return (
    <div role="radiogroup" aria-label="Ciclo de facturación" className="relative inline-grid grid-cols-2 rounded-full p-1 ps-glass">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-500"
        style={{
          background: "rgb(var(--ps-fg))",
          transform: cycle === "yearly" ? "translateX(100%)" : "none",
          transitionTimingFunction: "var(--ease-out)",
        }}
      />
      {(["monthly", "yearly"] as const).map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={cycle === c}
          onClick={() => onChange(c)}
          className={cn(
            "relative z-10 flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300",
            cycle === c ? "text-[rgb(var(--ps-bg))]" : "ps-fg-2 hover:text-[rgb(var(--ps-fg))]",
          )}
        >
          {c === "monthly" ? "Mensual" : "Anual"}
          {c === "yearly" && savings > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: "rgb(var(--ps-hi) / 0.22)", color: cycle === c ? "rgb(var(--ps-bg))" : "rgb(var(--ps-hi))" }}
            >
              2 meses gratis
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface Props {
  plans: PlanDTO[];
  cycle: BillingCycle;
  onCycle: (c: BillingCycle) => void;
  onCheckout: () => void;
  onBack: () => void;
  onReplay?: () => void;
}

export function PlanComparison({ plans, cycle, onCycle, onCheckout, onBack, onReplay }: Props) {
  const free = plans.find((p) => p.id === "free");
  const premium = plans.find((p) => p.id === "premium");
  if (!free || !premium) return null;
  const price = priceFor(premium, cycle);
  const perMonth = cycle === "yearly" ? premium.price_yearly / 12 : premium.price_monthly;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="text-center">
        <p className="ps-fade text-[11px] font-semibold uppercase tracking-[0.32em] ps-fg-3" style={d(0)}>Planes</p>
        <h2 className="ps-rise mt-3 font-display text-[clamp(1.8rem,4.2vw,3.2rem)] font-semibold tracking-[-0.03em] ps-fg" style={d(0.05)}>
          Deja de adivinar. <span className="ps-hi">Empieza a anticipar.</span>
        </h2>
        <p className="ps-rise mx-auto mt-3 max-w-lg text-sm ps-fg-2 sm:text-base" style={d(0.12)}>
          Tu ERP sigue siendo gratis. Premium desbloquea el Motor FTGM completo. Precios con IGV incluido.
        </p>
        <div className="ps-rise mt-7" style={d(0.2)}>
          <CycleToggle cycle={cycle} onChange={onCycle} savings={premium.yearly_savings} />
        </div>
      </div>

      <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.15fr] md:gap-5">
        {/* Free */}
        <div className="ps-rise ps-glass flex flex-col rounded-3xl p-6 sm:p-7" style={d(0.28)}>
          <p className="font-display text-lg font-semibold ps-fg">{free.name}</p>
          <p className="mt-1 text-sm ps-fg-3">{free.tagline}</p>
          <p className="mt-6 font-display text-4xl font-semibold ps-fg">S/ 0</p>
          <p className="mt-1 text-xs ps-fg-3">Para siempre</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {free.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 ps-fg-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 ps-fg-3" /> {f}
              </li>
            ))}
            {free.limits.map((f) => (
              <li key={f} className="flex items-start gap-2.5 ps-fg-3">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 opacity-60" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-7">
            <div className="rounded-xl px-4 py-2.5 text-center text-sm font-medium ps-line border ps-fg-3">Tu plan actual</div>
          </div>
        </div>

        {/* Premium */}
        <div className="ps-rise ps-glass-strong ps-shine relative flex flex-col rounded-3xl p-6 sm:p-7" style={d(0.38)}>
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-semibold ps-fg">{premium.name}</p>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgb(var(--ps-hi) / 0.16)", color: "rgb(var(--ps-hi))" }}>
              Recomendado
            </span>
          </div>
          <p className="mt-1 text-sm ps-fg-2">{premium.tagline}</p>
          <div className="mt-6 flex items-end gap-2">
            <p key={cycle} className="ps-pop font-display text-5xl font-semibold tracking-tight ps-fg">{fmtSoles(price, 0)}</p>
            <p className="mb-1.5 text-sm ps-fg-3">/ {cycle === "yearly" ? "año" : "mes"}</p>
          </div>
          <p className="mt-1 h-4 text-xs ps-fg-3">
            {cycle === "yearly"
              ? `Equivale a ${fmtSoles(perMonth)} al mes · ahorras ${fmtSoles(premium.yearly_savings, 0)}`
              : "Sin permanencia · cancela cuando quieras"}
          </p>
          <ul className="mt-6 grid gap-2.5 text-sm sm:grid-cols-1">
            {premium.features.map((f, i) => (
              <li key={f} className="flex items-start gap-2.5 ps-fg">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full" style={{ background: i === 0 ? "rgb(var(--ps-fg) / 0.12)" : "rgb(var(--ps-hi) / 0.2)" }}>
                  <Check className="h-3 w-3" style={{ color: i === 0 ? "rgb(var(--ps-fg))" : "rgb(var(--ps-hi))" }} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-7">
            <button onClick={onCheckout} className="btn ps-btn-light group h-12 w-full gap-2 rounded-2xl text-[15px]">
              Obtener Premium
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="ps-fade mt-7 flex flex-wrap items-center justify-center gap-3" style={d(0.55)}>
        <button onClick={onBack} className="btn ps-btn-ghost h-10 rounded-xl px-4 text-sm">Volver</button>
        {onReplay && (
          <button onClick={onReplay} className="btn h-10 gap-2 rounded-xl px-4 text-sm ps-fg-2 hover:text-[rgb(var(--ps-fg))]">
            <RotateCcw className="h-3.5 w-3.5" /> Ver de nuevo
          </button>
        )}
      </div>
    </div>
  );
}
