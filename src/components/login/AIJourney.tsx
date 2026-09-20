"use client";

import { useEffect, useState } from "react";
import { Boxes, Brain, Lightbulb, Receipt, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The product in one picture: your inventory and your sales flow into the AI brain,
 * and out comes the answer ("what to buy, how much, when"). Used on the login page
 * and at the end of the welcome flow.
 *
 * The animation loops through 4 stages (inventario → ventas → IA → respuesta); the
 * connectors carry a moving pulse and the brain "pumps" while it thinks.
 */
export function AIJourney({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStage(3);
      return;
    }
    const t = window.setInterval(() => setStage((s) => (s + 1) % 4), 2200);
    return () => window.clearInterval(t);
  }, []);

  const on = (i: number) => stage >= i;

  return (
    <div className={cn("w-full max-w-[600px]", className)}>
      <div className="glass rounded-xl p-6 shadow-soft-xl sm:p-8">
        {/* Sources: inventory + sales */}
        <div className="grid grid-cols-2 gap-4">
          <SourceCard
            active={on(0)}
            icon={Boxes}
            title="Tu inventario"
            rows={["Polo básico · 40 u", "Jean clásico · 25 u", "Casaca cuero · 8 u"]}
            compact={compact}
          />
          <SourceCard
            active={on(1)}
            icon={Receipt}
            title="Tus ventas"
            rows={["Lun · 12 ventas", "Mar · 9 ventas", "Mié · 15 ventas"]}
            compact={compact}
            bars
          />
        </div>

        {/* Connectors down into the brain */}
        <div className="relative mx-auto flex h-10 w-full max-w-[320px] items-stretch justify-between px-[52px]">
          <Connector active={on(2)} tilt="right" />
          <Connector active={on(2)} tilt="left" />
        </div>

        {/* The AI brain: a pumping square with stars */}
        <div className="flex justify-center">
          <div
            className={cn(
              "relative grid place-items-center rounded-xl transition-all duration-700",
              compact ? "h-20 w-20" : "h-24 w-24",
              on(2)
                ? "bg-gradient-to-br from-accent-violet to-primary shadow-[0_18px_50px_-14px_rgb(var(--c-accent)/0.55)]"
                : "bg-surface-muted",
            )}
          >
            {on(2) && (
              <>
                <span className="absolute inset-0 rounded-xl bg-accent-violet/30" style={{ animation: "brain-pump 2.2s ease-in-out infinite" }} />
                <Sparkles className="star-twinkle absolute -right-2.5 -top-2.5 h-5 w-5 text-warning" />
                <Sparkles className="star-twinkle absolute -bottom-2 -left-3 h-4 w-4 text-accent-violet" style={{ animationDelay: "0.7s" }} />
                <Sparkles className="star-twinkle absolute -left-4 top-1 h-3 w-3 text-primary" style={{ animationDelay: "1.3s" }} />
              </>
            )}
            <Brain
              className={cn(
                "relative z-10 transition-colors duration-500",
                compact ? "h-9 w-9" : "h-11 w-11",
                on(2) ? "text-white" : "text-text-muted",
              )}
              style={on(2) ? { animation: "brain-pump 2.2s ease-in-out infinite" } : undefined}
            />
          </div>
        </div>

        <p
          className={cn(
            "mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-500",
            on(2) ? "text-accent-violet" : "text-text-muted",
          )}
        >
          IA analizando tus datos…
        </p>

        {/* Connector down to the answer */}
        <div className="relative mx-auto h-8 w-px">
          <Connector active={on(3)} vertical />
        </div>

        {/* The answer */}
        <div
          className={cn(
            "mx-auto max-w-[420px] rounded-xl border p-4 transition-all duration-700",
            on(3)
              ? "translate-y-0 border-primary/30 bg-primary-softer/70 opacity-100 shadow-soft"
              : "translate-y-2 border-border bg-surface-soft/50 opacity-50",
          )}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Lightbulb className="h-3.5 w-3.5" /> La IA te responde
          </p>
          <p className="mt-1.5 text-sm font-semibold text-text-primary">
            Venderías ~132 unidades el próximo mes.
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Repón 24 u de «Jean clásico» antes del 14/10 y no compres más casacas por ahora.
          </p>
        </div>
      </div>
    </div>
  );
}

function SourceCard({
  active,
  icon: Icon,
  title,
  rows,
  bars = false,
  compact,
}: {
  active: boolean;
  icon: typeof Boxes;
  title: string;
  rows: string[];
  bars?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-all duration-700",
        active ? "border-primary/25 bg-surface shadow-soft" : "border-border bg-surface-soft/50 opacity-60",
      )}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
        <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-text-muted")} /> {title}
      </p>
      <div className="mt-2.5 space-y-1.5">
        {rows.slice(0, compact ? 2 : 3).map((r, i) => (
          <div
            key={r}
            className="flex items-center gap-2 overflow-hidden transition-all duration-500"
            style={{ opacity: active ? 1 : 0.35, transitionDelay: `${i * 140}ms` }}
          >
            {bars ? (
              <span
                className="h-1.5 rounded-full bg-primary/60 transition-all duration-700"
                style={{ width: active ? `${34 + i * 22}%` : "12%", transitionDelay: `${i * 140}ms` }}
              />
            ) : (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            )}
            <span className="truncate text-[11px] text-text-secondary">{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Connector({ active, vertical = false, tilt }: { active: boolean; vertical?: boolean; tilt?: "left" | "right" }) {
  return (
    <span
      className={cn(
        "relative block overflow-visible",
        vertical ? "h-full w-px" : "h-full w-px",
        tilt === "right" && "origin-top rotate-[24deg]",
        tilt === "left" && "origin-top -rotate-[24deg]",
      )}
    >
      <span
        className={cn(
          "absolute inset-0 border-l-2 border-dashed transition-colors duration-500",
          active ? "border-accent-violet/50" : "border-border",
        )}
      />
      {active && (
        <span
          className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-accent-violet shadow-[0_0_10px_rgb(var(--c-accent)/0.8)]"
          style={{ animation: "journey-drop 1.4s ease-in infinite" }}
        />
      )}
    </span>
  );
}
