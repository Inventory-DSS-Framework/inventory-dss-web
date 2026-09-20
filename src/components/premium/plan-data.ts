import type { BillingCycle, PlanDTO } from "@/types/billing";

/** Fallback catalog mirroring GET /billing/plans (used when the API is unreachable). */
export const FALLBACK_PLANS: PlanDTO[] = [
  {
    id: "free",
    name: "Gratis",
    tagline: "Tu ERP completo, sin costo.",
    currency: "PEN",
    price_monthly: 0,
    price_yearly: 0,
    yearly_savings: 0,
    features: [
      "Ventas y POS con boleta y factura",
      "Compras y proveedores",
      "Inventario y movimientos de stock",
      "Columnas personalizadas",
      "Usuarios vendedores",
      "Predicciones con IA (3 al mes)",
    ],
    limits: [
      "Límite de 3 predicciones con IA al mes",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Toda la IA trabajando para tu negocio.",
    currency: "PEN",
    price_monthly: 149,
    price_yearly: 1490,
    yearly_savings: 298,
    features: [
      "Todo lo del plan Gratis",
      "Predicciones con IA sin límite mensual",
      "Pronóstico por proveedor, vendedor o categoría",
      "Pronosticado vs real (seguimiento)",
      "Recomendaciones de compra automáticas",
      "KPIs de cobertura y riesgo de quiebre",
      "Alertas de reposición",
      "Reportes y KPIs exportables",
    ],
    limits: [],
  },
];

export const CYCLE_LABEL: Record<BillingCycle, string> = { monthly: "Mensual", yearly: "Anual" };

export const METHOD_LABEL: Record<string, string> = {
  card: "Tarjeta",
  yape: "Yape",
  transferencia: "Transferencia",
};

export function priceFor(plan: PlanDTO, cycle: BillingCycle): number {
  return cycle === "yearly" ? plan.price_yearly : plan.price_monthly;
}

export function parseCycle(v: string | null | undefined): BillingCycle {
  return v === "yearly" ? "yearly" : "monthly";
}

/** Peruvian receipt breakdown: price already includes 18% IGV. */
export function igvBreakdown(total: number) {
  const base = Math.round((total / 1.18) * 100) / 100;
  return { base, igv: Math.round((total - base) * 100) / 100, total };
}

export function addCycle(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + (cycle === "yearly" ? 12 : 1));
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

export const fmtDate = (v: string | Date) =>
  new Date(v).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });

export const fmtSoles = (v: number, decimals = 2) =>
  `S/ ${v.toLocaleString("es-PE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

/** Honours both the OS setting and the in-app motion preference. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.getAttribute("data-motion") === "reduced" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function closePremium(router: { back: () => void; push: (href: string) => void }) {
  if (typeof window !== "undefined" && window.history.length > 1) router.back();
  else router.push("/dashboard");
}
