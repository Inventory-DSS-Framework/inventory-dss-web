/** Date helpers pinned to the store's time zone (America/Lima). */

export const LIMA_TZ = "America/Lima";

/** YYYY-MM-DD for a Date in Lima time. */
export function limaISO(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: LIMA_TZ });
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export type RangePreset = "today" | "7d" | "30d" | "month" | "custom";

export function presetRange(preset: Exclude<RangePreset, "custom">): { from: string; to: string } {
  const today = limaISO();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDaysISO(today, -6), to: today };
    case "30d":
      return { from: addDaysISO(today, -29), to: today };
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
  }
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LIMA_TZ,
  });
}

export function formatLongDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LIMA_TZ,
  });
}

/** "12 set" label for a YYYY-MM-DD day. */
export function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });
}
