import {
  AlertOctagon, ArrowDownRight, ArrowUpRight, CheckCircle2, PackageMinus, ShoppingCart, Timer,
} from "lucide-react";
import type { OverviewProduct } from "@/types/ftgm";

/**
 * Plain-language decision dictionary for a retail owner: what to DO with each product after
 * a forecast. Every forecast row maps to exactly one action, chosen by simple, explainable
 * rules on stock, expected sales, days of cover, supplier lead time and trend.
 */
export type ActionId = "reponer_ya" | "reponer" | "descontinuar" | "no_comprar" | "baja" | "crece" | "mantener";

type Tone = "danger" | "warning" | "success" | "primary" | "violet" | "default";

export const ACTIONS: Record<ActionId, { title: string; short: string; tone: Tone; icon: typeof ShoppingCart; order: number }> = {
  reponer_ya: { title: "Repón ya", short: "Reponer urgente", tone: "danger", icon: AlertOctagon, order: 0 },
  reponer: { title: "Repón pronto", short: "Reponer", tone: "warning", icon: ShoppingCart, order: 1 },
  descontinuar: { title: "Descontinúa", short: "Descontinuar", tone: "default", icon: PackageMinus, order: 2 },
  no_comprar: { title: "No compres por ahora", short: "Sin comprar", tone: "violet", icon: Timer, order: 3 },
  baja: { title: "Se vende menos", short: "Vende menos", tone: "warning", icon: ArrowDownRight, order: 4 },
  crece: { title: "Está creciendo", short: "Creciendo", tone: "success", icon: ArrowUpRight, order: 5 },
  mantener: { title: "Todo en orden", short: "En orden", tone: "success", icon: CheckCircle2, order: 6 },
};

export interface Decision {
  action: ActionId;
  sentence: string;
  /** Expected sales per week/month in plain words ("≈ 12 por semana"). */
  rate: string;
  /** Days the current stock lasts, or null if it can't be said. */
  coverDays: number | null;
  confidence: "Alta" | "Media" | "Baja";
}

const round = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
const money = (n: number) => `S/ ${Math.round(n).toLocaleString("es-PE")}`;

export function decide(p: OverviewProduct): Decision {
  const perWeek = p.frequency === "weekly";
  const periodDays = perWeek ? 7 : 30;
  const unit = perWeek ? "semana" : "mes";
  const rateN = Math.max(0, p.next_period_units);
  const rate = rateN < 0.5 ? "casi nada" : `≈ ${round(rateN)} por ${unit}`;
  const daily = rateN / periodDays;
  const cover = p.coverage_days ?? (daily > 0 ? Math.round(p.on_hand / daily) : null);
  const buy = p.suggested_qty > 0 ? `Compra ${Math.ceil(p.suggested_qty)} u (≈ ${money(p.suggested_investment)})` : "Haz un pedido";
  const confidence = confidenceOf(p.accuracy_pct ?? null);
  const base = { rate, coverDays: cover, confidence };
  const trend = p.trend_pct ?? 0;

  if (p.total_forecast_units < 1) {
    return {
      ...base,
      action: "descontinuar",
      sentence:
        p.on_hand > 0
          ? `Casi no se vende. Liquida las ${p.on_hand} unidades que te quedan con una promoción y no vuelvas a comprarlo.`
          : "Ya casi no se vende. No vuelvas a comprarlo.",
    };
  }
  if (p.on_hand <= 0) {
    return { ...base, action: "reponer_ya", sentence: `Se te acabó y los clientes lo siguen pidiendo (${rate}). ${buy} cuanto antes.` };
  }
  if (p.needs_restock && p.stockout_risk === "alto") {
    return {
      ...base,
      action: "reponer_ya",
      sentence: `Te alcanza para unos ${cover ?? "pocos"} días y tu proveedor demora ${p.lead_time_days} días. ${buy} ya para no quedarte sin stock.`,
    };
  }
  if (p.needs_restock || p.suggested_qty > 0) {
    return { ...base, action: "reponer", sentence: `Pronto te faltará: tienes para unos ${cover ?? "pocos"} días. ${buy} esta semana.` };
  }
  if (cover != null && cover > 120) {
    return {
      ...base,
      action: "no_comprar",
      sentence: `Tienes stock para unos ${Math.round(cover / 30)} meses. No compres por ahora; una promoción te ayuda a venderlo más rápido.`,
    };
  }
  if (trend <= -25) {
    return { ...base, action: "baja", sentence: `Se vende ${Math.abs(Math.round(trend))}% menos que antes. En tu próxima compra pide menos.` };
  }
  if (trend >= 25) {
    return { ...base, action: "crece", sentence: `Se vende ${Math.round(trend)}% más que antes. Ponlo a la vista y no dejes que se agote.` };
  }
  return {
    ...base,
    action: "mantener",
    sentence: cover != null ? `Tienes para unos ${cover} días. No necesitas hacer nada por ahora.` : "Tu stock está bien. No necesitas hacer nada por ahora.",
  };
}

/**
 * How sure we are, from the plain accuracy the engine measured on the shop's own past sales
 * (100 − % of units missed on the forecast total). No accuracy → "Media".
 */
export function confidenceOf(accuracy: number | null): Decision["confidence"] {
  if (accuracy == null) return "Media";
  return accuracy >= 75 ? "Alta" : accuracy >= 55 ? "Media" : "Baja";
}
