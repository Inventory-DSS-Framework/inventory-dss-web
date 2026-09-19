"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { usePlan } from "@/hooks/usePlan";
import {
  applyMode, getModePref, getMotion, getPalette, resolveMode,
  setModePref as persistMode, setMotion as persistMotion, setPalette as persistPalette, setTier,
  type ModePref, type Motion, type PaletteId,
} from "@/lib/appearance";

export type Stage = "none" | "ftgm";
export type Tier = "base" | "premium";

interface Experience {
  tier: Tier;
  isPremium: boolean;
  /** "ftgm" while inside the Motor FTGM routes — the black/neon cinema. */
  stage: Stage;
  /** Rich effects on (premium or stage, and motion not reduced). */
  effects: boolean;
  modePref: ModePref;
  setModePref: (m: ModePref) => void;
  palette: PaletteId;
  setPalette: (p: PaletteId) => void;
  motion: Motion;
  setMotion: (m: Motion) => void;
}

const DEFAULT: Experience = {
  tier: "base",
  isPremium: false,
  stage: "none",
  effects: false,
  modePref: "light",
  setModePref: () => {},
  palette: "emerald",
  setPalette: () => {},
  motion: "full",
  setMotion: () => {},
};

const ExperienceContext = createContext<Experience>(DEFAULT);

export const useExperience = () => useContext(ExperienceContext);

// Motor FTGM used to switch to a dark "cinema" stage; it now keeps the same light ERP look
// (and the user's own light/dark choice) so forecasts read like the rest of the app.
export const stageFor = (_pathname: string): Stage => "none";

/**
 * Owns the three experience layers — Base (ERP), Premium, and the Motor FTGM stage —
 * and mirrors them onto <html> attributes so CSS does the heavy lifting everywhere.
 * Also runs the single pointer listener that powers every cursor spotlight.
 */
export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const plan = usePlan();

  // While the subscription loads, trust the cached tier so premium users never see a downgrade flash.
  const [cachedPremium] = useState(() => document.documentElement.getAttribute("data-tier") === "premium");
  const isPremium = plan.loading ? cachedPremium : plan.isPremium;
  const tier: Tier = isPremium ? "premium" : "base";
  const stage = stageFor(pathname);

  const [modePref, setModeState] = useState<ModePref>(getModePref);
  const [palette, setPaletteState] = useState<PaletteId>(getPalette);
  const [motion, setMotionState] = useState<Motion>(getMotion);

  useEffect(() => {
    if (!plan.loading) setTier(tier);
  }, [tier, plan.loading]);

  useEffect(() => {
    document.documentElement.setAttribute("data-stage", stage);
  }, [stage]);

  useEffect(() => {
    if (modePref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyMode(resolveMode("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [modePref]);

  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;
    const flush = () => {
      frame = 0;
      if (!last) return;
      const target = (last.target as Element | null)?.closest?.("[data-spotlight]") as HTMLElement | null;
      if (target) {
        const r = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${last.clientX - r.left}px`);
        target.style.setProperty("--my", `${last.clientY - r.top}px`);
      }
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const setModePref = useCallback((m: ModePref) => {
    persistMode(m);
    setModeState(m);
  }, []);
  const setPalette = useCallback((p: PaletteId) => {
    persistPalette(p);
    setPaletteState(p);
  }, []);
  const setMotion = useCallback((m: Motion) => {
    persistMotion(m);
    setMotionState(m);
  }, []);

  const value = useMemo<Experience>(
    () => ({
      tier,
      isPremium,
      stage,
      effects: (isPremium || stage === "ftgm") && motion === "full",
      modePref,
      setModePref,
      palette,
      setPalette,
      motion,
      setMotion,
    }),
    [tier, isPremium, stage, motion, modePref, setModePref, palette, setPalette, setMotion],
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}
