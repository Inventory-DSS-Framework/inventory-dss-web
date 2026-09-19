/**
 * Appearance preferences (mode, premium palette, motion) live on <html> attributes
 * and in localStorage. These helpers are framework-free so the login page (outside
 * the ExperienceProvider) and the app shell share exactly the same behaviour.
 */

export type ModePref = "light" | "dark" | "system";
export type Motion = "full" | "reduced";

export const PALETTES = [
  { id: "emerald", label: "Esmeralda", swatch: ["#0CA884", "#2DD4A0"] },
  { id: "ocean", label: "Océano", swatch: ["#0284C7", "#38BDF8"] },
  { id: "violet", label: "Violeta", swatch: ["#7C3AED", "#A78BFA"] },
  { id: "sunset", label: "Atardecer", swatch: ["#EA580C", "#FB923C"] },
  { id: "rose", label: "Rosa", swatch: ["#DB2777", "#F472B6"] },
  { id: "amber", label: "Ámbar", swatch: ["#CA8A04", "#FACC15"] },
] as const;
export type PaletteId = (typeof PALETTES)[number]["id"];

const KEYS = { mode: "dss-mode", palette: "dss-palette", motion: "dss-motion", tier: "dss-tier" } as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked — the attribute still applies for this session */
  }
}

const root = () => document.documentElement;

export function resolveMode(pref: ModePref): "light" | "dark" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getModePref(): ModePref {
  const v = read(KEYS.mode);
  return v === "dark" || v === "system" ? v : "light";
}

export function setModePref(pref: ModePref) {
  write(KEYS.mode, pref);
  applyMode(resolveMode(pref));
}

/** Swaps the mode with a brief cross-fade so the whole UI doesn't snap. */
export function applyMode(mode: "light" | "dark") {
  const el = root();
  if (el.getAttribute("data-mode") === mode) return;
  el.classList.add("mode-switching");
  el.setAttribute("data-mode", mode);
  window.setTimeout(() => el.classList.remove("mode-switching"), 450);
}

export function getPalette(): PaletteId {
  const v = read(KEYS.palette);
  return (PALETTES.find((p) => p.id === v)?.id ?? "emerald") as PaletteId;
}
export function setPalette(id: PaletteId) {
  write(KEYS.palette, id);
  root().setAttribute("data-palette", id);
}

export function getMotion(): Motion {
  return read(KEYS.motion) === "reduced" ? "reduced" : "full";
}
export function setMotion(m: Motion) {
  write(KEYS.motion, m);
  root().setAttribute("data-motion", m);
}

export function setTier(tier: "base" | "premium") {
  write(KEYS.tier, tier);
  root().setAttribute("data-tier", tier);
}
