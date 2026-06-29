"use client";

import { useEffect, useState } from "react";

interface BrandColors {
  primary: string;
  accent: string;
  muted: string;
}

const FALLBACK: BrandColors = { primary: "#0FB3A6", accent: "#FB7A5B", muted: "#9AA1B9" };

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `rgb(${value})` : fallback;
}

/**
 * Resolves the active theme's brand colors (from the CSS channel variables) for use in
 * chart libraries that need concrete color strings. Re-reads when the theme changes.
 */
export function useBrandColors(): BrandColors {
  const [colors, setColors] = useState<BrandColors>(FALLBACK);

  useEffect(() => {
    const update = () =>
      setColors({
        primary: readVar("--c-primary", FALLBACK.primary),
        accent: readVar("--c-accent", FALLBACK.accent),
        muted: readVar("--c-text-muted", FALLBACK.muted),
      });
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
