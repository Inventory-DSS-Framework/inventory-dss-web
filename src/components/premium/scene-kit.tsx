"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Small shared pieces for the animated "presentation" sequences (the AI stage in
 * /forecasting and the Premium teaser). The visuals themselves come from the `ps-*`
 * helpers in globals.css, so both flows breathe with the same rhythm.
 */

export type Style = React.CSSProperties & Record<`--${string}`, string>;

/** Animation delay, in seconds, for any `ps-*` helper. */
export const d = (s: number): Style => ({ "--d": `${s}s` });

/** How long a scene takes to blur out before the next one takes over. */
export const OUT_MS = 420;

/**
 * Drives a sequence of timed scenes: holds each one for its own duration, blurs out,
 * and hands over to the next. The last scene stays put — whoever owns the sequence
 * decides what happens after it.
 */
export function useSceneSequence(durations: number[], { enabled = true }: { enabled?: boolean } = {}) {
  const last = durations.length - 1;
  const [scene, setScene] = useState(enabled ? 0 : last);
  const [leaving, setLeaving] = useState(false);
  const [run, setRun] = useState(0);
  const pending = useRef<number | null>(null);

  const clear = () => {
    if (pending.current) window.clearTimeout(pending.current);
    pending.current = null;
  };

  const go = useCallback(
    (next: number) => {
      clear();
      if (!enabled) {
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
    [enabled],
  );

  // Auto-advance while there is a next scene.
  useEffect(() => {
    if (!enabled || leaving || scene >= last) return;
    const hold = window.setTimeout(() => go(scene + 1), Math.max(0, durations[scene] - OUT_MS));
    return () => window.clearTimeout(hold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, leaving, run, enabled, go]);

  useEffect(() => clear, []);

  const replay = useCallback(() => {
    setRun((r) => r + 1);
    go(0);
  }, [go]);

  return { scene, leaving, run, go, replay, isLast: scene >= last };
}

/** A headline that blurs in word by word. */
export function Words({
  text,
  start = 0,
  step = 0.12,
  className,
}: {
  text: string;
  start?: number;
  step?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={`${w}-${i}`} className="ps-word mr-[0.24em] last:mr-0" style={d(start + i * step)}>
          {w}
        </span>
      ))}
    </span>
  );
}

/** Section label above every scene headline. */
export function Eyebrow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <p className="ps-fade text-[11px] font-semibold uppercase tracking-[0.32em] ps-fg-3" style={d(delay)}>
      {children}
    </p>
  );
}

/**
 * The progress rail: one segment per scene, the active one filling in real time.
 * Clicking a segment jumps to that scene.
 */
export function SceneRail({
  labels,
  durations,
  scene,
  leaving,
  run,
  onGo,
  className,
}: {
  labels: string[];
  durations: number[];
  scene: number;
  leaving: boolean;
  run: number;
  onGo?: (i: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-md items-center gap-1.5", className)} aria-label="Progreso">
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={onGo ? () => onGo(i) : undefined}
          aria-label={label}
          aria-current={i === scene}
          className="group relative h-5 flex-1"
          disabled={!onGo}
        >
          <span
            className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full"
            style={{ background: "rgb(var(--ps-fg) / 0.14)" }}
          >
            {i < scene && <span className="absolute inset-0 rounded-full" style={{ background: "rgb(var(--ps-fg) / 0.75)" }} />}
            {i === scene && !leaving && (
              <span
                key={`${run}-${scene}`}
                className="ps-progress-fill absolute inset-0 rounded-full"
                style={{ background: "rgb(var(--ps-hi))", "--t": `${durations[i] ?? 3000}ms` } as Style}
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
}
