"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingCycle, PlanDTO } from "@/types/billing";
import { PremiumOverlay } from "./PremiumOverlay";
import { SceneEngine, SceneFeatures, SceneHook, SceneYou, type CompanyStats } from "./IntroScenes";
import { PlanComparison } from "./PlanComparison";

/** Timed scenes (ms). The last scene — plans — stays until the user acts. */
const DURATIONS = [3000, 4400, 3300, 3300];
const FINAL = DURATIONS.length;
const LABELS = ["Anticípate", "El motor", "Premium", "Tu negocio", "Planes"];
const OUT_MS = 420;

interface Props {
  plans: PlanDTO[];
  stats: CompanyStats | null;
  reduced: boolean;
  cycle: BillingCycle;
  onCycle: (c: BillingCycle) => void;
  onCheckout: () => void;
  onClose: () => void;
}

export function PremiumIntro({ plans, stats, reduced, cycle, onCycle, onCheckout, onClose }: Props) {
  const [scene, setScene] = useState(reduced ? FINAL : 0);
  const [leaving, setLeaving] = useState(false);
  const [run, setRun] = useState(0);
  const pending = useRef<number | null>(null);

  const go = useCallback(
    (next: number) => {
      if (pending.current) window.clearTimeout(pending.current);
      if (reduced) {
        setScene(next);
        return;
      }
      setLeaving(true);
      pending.current = window.setTimeout(() => {
        pending.current = null;
        setScene(next);
        setLeaving(false);
      }, OUT_MS);
    },
    [reduced],
  );

  useEffect(() => () => {
    if (pending.current) window.clearTimeout(pending.current);
  }, []);

  // Auto-advance through the timed scenes.
  useEffect(() => {
    if (scene >= FINAL || leaving) return;
    const t = window.setTimeout(() => go(scene + 1), DURATIONS[scene]);
    return () => window.clearTimeout(t);
  }, [scene, leaving, run, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && scene < FINAL) go(scene + 1);
      if (e.key === "ArrowLeft" && scene > 0) go(scene - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene, go]);

  const replay = () => {
    setRun((r) => r + 1);
    go(0);
  };

  const progress = (
    <div className="mx-auto flex w-full max-w-md items-center gap-1.5" aria-label="Progreso de la presentación">
      {LABELS.map((label, i) => (
        <button
          key={label}
          onClick={() => go(i)}
          aria-label={label}
          aria-current={i === scene}
          className="group relative h-5 flex-1"
        >
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full" style={{ background: "rgb(var(--ps-fg) / 0.14)" }}>
            {(i < scene || (i === FINAL && scene === FINAL)) && <span className="absolute inset-0 rounded-full" style={{ background: "rgb(var(--ps-fg) / 0.75)" }} />}
            {i === scene && i < FINAL && !leaving && (
              <span
                key={`${run}-${scene}`}
                className="ps-progress-fill absolute inset-0 rounded-full"
                style={{ background: "rgb(var(--ps-hi))", "--t": `${DURATIONS[i]}ms` } as React.CSSProperties}
              />
            )}
          </span>
          <span className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap text-[10px] opacity-0 transition-opacity group-hover:opacity-100 ps-fg-3">
            {label}
          </span>
        </button>
      ))}
    </div>
  );

  const skip =
    scene < FINAL ? (
      <button onClick={() => go(FINAL)} className="btn ps-btn-ghost h-9 gap-1.5 rounded-full px-3.5 text-[13px]">
        Saltar intro <ChevronsRight className="h-3.5 w-3.5" />
      </button>
    ) : null;

  return (
    <PremiumOverlay label="Plan Premium — Predicciones con IA" onClose={onClose} actions={skip} subheader={progress}>
      <div key={`${run}-${scene}`} className={cn("min-h-full", scene < FINAL && "h-full", leaving ? "ps-scene-out" : "ps-scene-in")}>
        {scene === 0 && <SceneHook />}
        {scene === 1 && <SceneEngine />}
        {scene === 2 && <SceneFeatures />}
        {scene === 3 && <SceneYou stats={stats} instant={reduced} />}
        {scene === FINAL && (
          <div className="flex min-h-full items-center">
            <PlanComparison plans={plans} cycle={cycle} onCycle={onCycle} onCheckout={onCheckout} onBack={onClose} onReplay={reduced ? undefined : replay} />
          </div>
        )}
      </div>
      {scene < FINAL && (
        <p className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 text-[11px] tracking-wide sm:block ps-fg-3">
          → siguiente · Esc cerrar
        </p>
      )}
    </PremiumOverlay>
  );
}
