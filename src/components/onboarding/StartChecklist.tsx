"use client";

import Link from "next/link";
import { Check, ArrowRight, Rocket, PartyPopper, Building2, BrainCircuit } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { OnboardingState, OnboardingStep } from "@/hooks/useOnboarding";

/**
 * The start-up checklist: the single place that answers "where am I and what's next".
 * Four steps, auto-checked from real data, with the current step highlighted and a
 * clear CTA. Collapses to a compact "all set" banner once every step is done.
 */
export function StartChecklist({ state }: { state: OnboardingState }) {
  const { steps, completed, total, allDone, next, loading } = state;

  if (loading) {
    return <Card className="h-[132px] animate-pulse bg-surface-soft/60" />;
  }

  if (allDone) {
    return (
      <Card className="flex items-center gap-4 border-success/20 bg-success-soft/40">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
          <PartyPopper className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-text-primary">Todo listo 🎉</p>
          <p className="text-sm text-text-secondary">
            Ya está todo listo. Mira cuánto venderás, qué comprar y cómo van tus números.
          </p>
        </div>
        <Link
          href="/forecasting"
          className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:text-primary-hover"
        >
          Ver cuánto venderé <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    );
  }

  const pct = Math.round((completed / total) * 100);
  const erpSteps = steps.filter((s) => s.phase === "erp");
  const ftgmSteps = steps.filter((s) => s.phase === "ftgm");
  const erpDone = erpSteps.every((s) => s.done);

  return (
    <Card particle className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text-primary">Primeros pasos</h3>
            <p className="text-xs text-text-secondary">
              Dos pasos: carga tus productos y ventas, y luego calcula cuánto venderás.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-text-secondary">
            {completed}/{total}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PhaseGroup
          label="Fase 1 · ERP"
          icon={Building2}
          caption="Tus datos base."
          steps={erpSteps}
          next={next}
          tone="neutral"
        />
        <PhaseGroup
          label="Fase 2 · Motor FTGM"
          icon={BrainCircuit}
          caption={erpDone ? "Listo para pronosticar." : "Se activa cuando termines la Fase 1."}
          steps={ftgmSteps}
          next={next}
          tone="brand"
          locked={!erpDone}
        />
      </div>
    </Card>
  );
}

function PhaseGroup({
  label,
  icon: Icon,
  caption,
  steps,
  next,
  tone,
  locked,
}: {
  label: string;
  icon: typeof Rocket;
  caption: string;
  steps: OnboardingStep[];
  next: OnboardingStep | null;
  tone: "neutral" | "brand";
  locked?: boolean;
}) {
  const brand = tone === "brand";
  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5",
        brand ? "border-accent-violet/20 bg-accent-violet-soft/25" : "border-border-soft bg-surface-soft/40",
      )}
    >
      <div className="flex items-center gap-1.5 px-0.5 mb-0.5">
        <Icon className={cn("h-3.5 w-3.5", brand ? "text-accent-violet" : "text-text-muted")} />
        <p className={cn("text-[11px] font-bold uppercase tracking-wide", brand ? "text-accent-violet" : "text-text-muted")}>
          {label}
        </p>
      </div>
      <p className="px-0.5 mb-2.5 text-[11px] text-text-muted">{caption}</p>
      <div className="space-y-2">
        {steps.map((s) => (
          <StepRow key={s.key} step={s} isNext={s.key === next?.key} tone={tone} disabled={locked} />
        ))}
      </div>
    </div>
  );
}

function StepRow({
  step,
  isNext,
  tone,
  disabled,
}: {
  step: OnboardingStep;
  isNext: boolean;
  tone: "neutral" | "brand";
  disabled?: boolean;
}) {
  const brand = tone === "brand";
  return (
    <Link
      href={step.href}
      aria-disabled={disabled}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
        disabled && "pointer-events-none opacity-50",
        step.done
          ? "border-border-soft bg-surface/70"
          : isNext
            ? brand
              ? "border-accent-violet/40 bg-surface hover:border-accent-violet"
              : "border-primary/40 bg-primary-soft/40 hover:border-primary"
            : "border-border bg-surface/70 hover:border-primary/30",
      )}
    >
      <div
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold tabular-nums transition-colors",
          step.done
            ? "bg-success text-white"
            : isNext
              ? brand
                ? "bg-accent-violet text-white"
                : "bg-primary text-white"
              : "bg-surface-muted text-text-muted",
        )}
      >
        {step.done ? <Check className="h-3.5 w-3.5" /> : step.step}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-[13px] font-semibold",
              step.done ? "text-text-secondary" : "text-text-primary",
            )}
          >
            {step.title}
          </p>
          {isNext && !step.done && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
                brand ? "bg-accent-violet" : "bg-primary",
              )}
            >
              Sigue
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-text-muted">
          {step.done ? (step.detail ?? "Completado") : step.description}
        </p>
      </div>

      {!step.done && (
        <ArrowRight
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isNext ? (brand ? "text-accent-violet" : "text-primary") : "text-text-muted group-hover:text-text-secondary",
          )}
        />
      )}
    </Link>
  );
}
