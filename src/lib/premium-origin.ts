/**
 * Where the person clicked to reach Premium.
 *
 * The plans intro grows out of that exact point, so the overlay feels like it came
 * from the button they pressed instead of appearing out of nowhere. Any Premium CTA
 * can opt in by calling `markPremiumOrigin` on click; the ones that don't simply get
 * the centred reveal.
 */
const KEY = "premium:origin";
/** A click older than this isn't what brought the person here (back button, refresh…). */
const FRESH_MS = 5000;

export interface Origin {
  x: number;
  y: number;
}

export function markPremiumOrigin(e: { clientX: number; clientY: number }): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ x: e.clientX, y: e.clientY, at: Date.now() }));
  } catch {
    /* private mode: the intro just opens from the centre */
  }
}

/**
 * Reads the stored origin without consuming it: reading has to stay idempotent,
 * because React mounts effects twice in development.
 */
export function peekPremiumOrigin(): Origin | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { x?: number; y?: number; at?: number };
    if (typeof v.x !== "number" || typeof v.y !== "number") return null;
    if (Date.now() - (v.at ?? 0) > FRESH_MS) return null;
    return { x: v.x, y: v.y };
  } catch {
    return null;
  }
}

/** Consumed once the intro is on screen, so a refresh doesn't replay it. */
export function clearPremiumOrigin(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
