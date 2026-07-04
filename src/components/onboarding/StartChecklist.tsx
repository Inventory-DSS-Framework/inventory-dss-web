"use client";

import Link from "next/link";
import { Check, ArrowRight, Rocket, PartyPopper } from "lucide-react";
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
            Tu pipeline está completo. Explora tus pronósticos, KPIs y recomendaciones.
          </p>
        </div>
        <Link
          href="/forecasting"
          className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:text-primary-hover"
        >
          Ver pronósticos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    );
  }

  const pct = Math.round((completed / total) * 100);

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
              Completa el flujo para obtener tu primer pronóstico.
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

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {steps.map((s) => (
          <StepRow key={s.key} step={s} isNext={s.key === next?.key} />
        ))}
      </div>
    </Card>
  );
}

function StepRow({ step, isNext }: { step: OnboardingStep; isNext: boolean }) {
  return (
    <Link
      href={step.href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
        step.done
          ? "border-border-soft bg-surface-soft/50"
          : isNext
            ? "border-primary/40 bg-primary-soft/40 hover:border-primary"
            : "border-border bg-surface-soft hover:border-primary/30",
      )}
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold tabular-nums transition-colors",
          step.done
            ? "bg-success text-white"
            : isNext
              ? "bg-primary text-white"
              : "bg-surface-muted text-text-muted",
        )}
      >
        {step.done ? <Check className="h-4 w-4" /> : step.step}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              step.done ? "text-text-secondary" : "text-text-primary",
            )}
          >
            {step.title}
          </p>
          {isNext && !step.done && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Sigue
            </span>
          )}
        </div>
        <p className="truncate text-xs text-text-muted">
          {step.done ? (step.detail ?? "Completado") : step.description}
        </p>
      </div>

      {!step.done && (
        <ArrowRight
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isNext ? "text-primary" : "text-text-muted group-hover:text-text-secondary",
          )}
        />
      )}
    </Link>
  );
}
