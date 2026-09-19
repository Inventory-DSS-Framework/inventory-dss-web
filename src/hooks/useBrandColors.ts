"use client";

import { useEffect, useState } from "react";

export interface BrandColors {
  primary: string;
  accent: string;
  /** Tertiary series color (magenta on the FTGM stage). */
  accent2: string;
  muted: string;
  success: string;
  warning: string;
  danger: string;
  text: string;
  /** Chart gridlines. */
  grid: string;
  surface: string;
}

const FALLBACK: BrandColors = {
  primary: "#0CA884",
  accent: "#0F766E",
  accent2: "#68C7A8",
  muted: "#8A9692",
  success: "#10B981",
  warning: "#E28E12",
  danger: "#E1464E",
  text: "#0F1715",
  grid: "#E3E8E5",
  surface: "#FFFFFF",
};

function readVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value ? `rgb(${value.split(/\s+/).join(", ")})` : fallback;
}

/**
 * Resolves the live palette (from the CSS channel variables) for chart libraries that
 * need concrete color strings. Re-reads whenever mode, palette, tier or stage change.
 */
export function useBrandColors(): BrandColors {
  const [colors, setColors] = useState<BrandColors>(FALLBACK);

  useEffect(() => {
    const update = () => {
      const s = getComputedStyle(document.documentElement);
      setColors({
        primary: readVar(s, "--c-primary", FALLBACK.primary),
        accent: readVar(s, "--c-accent", FALLBACK.accent),
        accent2: readVar(s, "--c-accent-2", FALLBACK.accent2),
        muted: readVar(s, "--c-text-muted", FALLBACK.muted),
        success: readVar(s, "--c-success", FALLBACK.success),
        warning: readVar(s, "--c-warning", FALLBACK.warning),
        danger: readVar(s, "--c-danger", FALLBACK.danger),
        text: readVar(s, "--c-text", FALLBACK.text),
        grid: readVar(s, "--c-border-soft", FALLBACK.grid),
        surface: readVar(s, "--c-surface", FALLBACK.surface),
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode", "data-palette", "data-tier", "data-stage"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
