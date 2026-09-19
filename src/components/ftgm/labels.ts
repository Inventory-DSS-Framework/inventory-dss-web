import type { Readiness, StockoutRisk, TrackingStatus } from "@/types/ftgm";

type Tone = "default" | "success" | "warning" | "danger" | "primary" | "violet";

export const units = (v: number | null | undefined, digits = 0) =>
  `${Number(v ?? 0).toLocaleString("es-PE", { maximumFractionDigits: digits, minimumFractionDigits: 0 })} u`;

export const num = (v: number | null | undefined, digits = 0) =>
  Number(v ?? 0).toLocaleString("es-PE", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const pct = (v: number | null | undefined, digits = 1) =>
  v == null || !Number.isFinite(Number(v)) ? "—" : `${Number(v).toFixed(digits)}%`;

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-03-01" -> "mar 26" (monthly) or "16 mar" (weekly). */
export function periodLabel(iso: string | null | undefined, frequency: string | null = "monthly") {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (frequency === "weekly") return `${d} ${MONTHS[m - 1]}`;
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

export function dateLabel(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export const frequencyLabel: Record<string, string> = {
  auto: "Automática",
  monthly: "Mensual",
  weekly: "Semanal",
  mixed: "Mixta (por producto)",
};

export const readinessMeta: Record<Readiness, { label: string; tone: Tone }> = {
  listo: { label: "Listo", tone: "success" },
  pocos_datos: { label: "Pocos datos · baseline", tone: "warning" },
  sin_ventas: { label: "Sin ventas · excluido", tone: "default" },
  en_curso: { label: "Ventas en curso · aún no", tone: "primary" },
};

export const modelLabel: Record<string, string> = {
  FTGM: "FTGM",
  FTGMCombo: "FTGM combinado",
  DampedTrend: "Suavizado de nivel",
  SeasonalDamped: "Suavizado estacional",
  SeasonalNaive: "Temporada anterior",
  CrostonSBA: "Croston-SBA",
  MovingAverage: "Promedio móvil",
  None: "Omitido",
};

export const riskMeta: Record<StockoutRisk, { label: string; tone: Tone }> = {
  alto: { label: "Riesgo alto", tone: "danger" },
  medio: { label: "Riesgo medio", tone: "warning" },
  bajo: { label: "Riesgo bajo", tone: "success" },
};

export const trackingMeta: Record<TrackingStatus, { label: string; tone: Tone }> = {
  en_linea: { label: "En línea", tone: "success" },
  sobre_pronostico: { label: "Sobre pronóstico", tone: "warning" },
  bajo_pronostico: { label: "Bajo pronóstico", tone: "danger" },
  pendiente: { label: "Pendiente", tone: "default" },
};

export const runStatusMeta: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "En cola", tone: "default" },
  running: { label: "Procesando", tone: "violet" },
  success: { label: "Completado", tone: "success" },
  failed: { label: "Fallido", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "warning" },
};

export const horizonLabel = (days: number) => {
  if (days % 365 === 0) return `${days / 365} año${days / 365 > 1 ? "s" : ""}`;
  const months = Math.round(days / 30);
  return months >= 1 ? `${months} mes${months > 1 ? "es" : ""}` : `${days} días`;
};

/** "para el próximo mes" / "para los próximos 3 meses" / "para las próximas 2 semanas". */
export function forWhen(days: number): string {
  if (days % 30 === 0 || days >= 28) {
    const m = Math.max(1, Math.round(days / 30));
    return m === 1 ? "para el próximo mes" : `para los próximos ${m} meses`;
  }
  const w = Math.max(1, Math.round(days / 7));
  return w === 1 ? "para la próxima semana" : `para las próximas ${w} semanas`;
}
