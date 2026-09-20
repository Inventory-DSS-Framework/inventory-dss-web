"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import type { ErpSummary, FtgmRun } from "@/types/ftgm";
import type { RecommendationDTO } from "@/types/api";

type Tone = "danger" | "warning" | "success" | "info";
interface Tip {
  id: string;
  tone: Tone;
  text: string;
  href: string;
  cta: string;
  /** Lower shows first. */
  rank: number;
}

/**
 * "Analizamos tus productos con IA…" — always-on recommendations for free and premium.
 * Under the hood it is a dictionary of ~20 plain rules crossing the data the dashboard
 * already fetched (summary, pending recommendations, latest run): no extra requests,
 * so it refreshes with the page.
 */
export function AiTips({
  s,
  pendingRecs,
  urgentRecs,
  latestRun,
}: {
  s: ErpSummary;
  pendingRecs: RecommendationDTO[];
  urgentRecs: number;
  latestRun: FtgmRun | null;
}) {
  const tips = buildTips(s, pendingRecs, urgentRecs, latestRun).slice(0, 3);

  return (
    <Card className="ia-border relative border-accent-violet/20 bg-gradient-to-b from-accent-violet-soft/40 to-transparent">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-violet text-white">
          <Sparkles className="star-twinkle h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold text-text-primary">Analizamos tus productos con IA</p>
          <p className="text-[11px] text-text-muted">Recomendaciones al día con tu inventario y tus ventas</p>
        </div>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        {tips.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              "group flex flex-col justify-between gap-2.5 rounded-xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-soft",
              t.tone === "danger" && "border-danger/25 bg-danger-soft/40",
              t.tone === "warning" && "border-warning/25 bg-warning-soft/40",
              t.tone === "success" && "border-success/25 bg-success-soft/40",
              t.tone === "info" && "border-border bg-surface",
            )}
          >
            <p className="text-[13px] leading-snug text-text-primary">{t.text}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {t.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function buildTips(s: ErpSummary, pendingRecs: RecommendationDTO[], urgentRecs: number, latestRun: FtgmRun | null): Tip[] {
  const tips: Tip[] = [];
  const add = (id: string, tone: Tone, rank: number, text: string, href: string, cta: string) =>
    tips.push({ id, tone, rank, text, href, cta });

  const bottom = s.bottom_products ?? [];
  const dead = bottom.find((p) => p.units === 0 && p.on_hand > 0);
  const deadBig = bottom.find((p) => p.units === 0 && p.on_hand >= 20);
  const top1 = s.top_products[0];
  const month = new Date().getMonth(); // 0-based

  // 1-4 · stock urgencies
  if (s.out_of_stock_count > 0)
    add("out", "danger", 1, `${s.out_of_stock_count} producto(s) están en cero: cada día sin stock son ventas que pierdes. Te recomendamos reponerlos ya.`, "/inventory?filtro=sin-stock", "Ver cuáles");
  if (urgentRecs > 0)
    add("urgent", "danger", 2, `Detectamos ${urgentRecs} producto(s) que debes reponer con urgencia según lo que venderás.`, "/recommendations", "Ver qué comprar");
  if (s.lost_sales_30d_attempts > 0)
    add("lost", "danger", 3, `Este mes te pidieron ${s.lost_sales_30d_units} unidad(es) que no tenías. Repón a tiempo para no repetirlo.`, "/recommendations", "Planificar compras");
  if (s.low_stock_count > 0 && s.out_of_stock_count === 0)
    add("low", "warning", 4, `${s.low_stock_count} producto(s) están por acabarse. Repón antes de que lleguen a cero.`, "/inventory", "Revisar stock");

  // 5-8 · dead stock / money on the shelf
  if (deadBig)
    add("deadbig", "warning", 5, `Tienes ${deadBig.on_hand} u de «${deadBig.name}» sin una sola venta en 30 días: plata inmovilizada. Deberías dejar de comprarlo y probar una promoción.`, `/inventory/${deadBig.product_id}`, "Ver producto");
  else if (dead)
    add("dead", "warning", 6, `«${dead.name}» no vendió nada en 30 días. No compres más por ahora; una oferta ayuda a moverlo.`, `/inventory/${dead.product_id}`, "Ver producto");
  if (pendingRecs.length > 0 && urgentRecs === 0)
    add("recs", "info", 7, `Tienes ${pendingRecs.length} sugerencia(s) de compra listas, calculadas con tus ventas.`, "/recommendations", "Ver la lista");

  // 9-12 · margin
  if (s.margin_pct_30d != null && s.margin_pct_30d < 15 && s.revenue_30d > 0)
    add("margin-low", "warning", 8, `Tu margen bruto del mes es ${s.margin_pct_30d}%: bajo para retail. Revisa costos y precios de lo que más vendes.`, "/kpis", "Ver mis números");
  if (s.margin_pct_30d != null && s.margin_pct_30d >= 40)
    add("margin-ok", "success", 12, `Buen margen: te queda ${s.margin_pct_30d}% de cada sol vendido (${soles(s.gross_margin_30d)} este mes).`, "/kpis", "Ver mis números");

  // 13-15 · sales trend
  if (s.revenue_change_pct != null && s.revenue_change_pct <= -20)
    add("down", "warning", 9, `Vendiste ${Math.abs(s.revenue_change_pct)}% menos que el mes anterior. Revisa qué productos cayeron.`, "/sales", "Ver mis ventas");
  if (s.revenue_change_pct != null && s.revenue_change_pct >= 20)
    add("up", "success", 11, `Vas ${s.revenue_change_pct}% arriba del mes pasado. Asegura stock de lo que más rota.`, "/inventory", "Revisar stock");
  if (top1 && s.revenue_30d > 0 && top1.revenue / s.revenue_30d > 0.5)
    add("conc", "info", 10, `«${top1.name}» concentra más de la mitad de tus ventas. Cuida su stock como oro.`, `/inventory/${top1.product_id}`, "Ver producto");

  // 16-18 · get the data flowing
  if (s.revenue_30d === 0 && s.active_products > 0)
    add("nosales", "info", 2, "Tienes productos pero ningún registro de ventas del último mes. Registra o importa tus ventas para que la IA pueda predecir.", "/sales?tab=imported", "Cargar ventas");
  if (s.active_products === 0)
    add("noprod", "info", 1, "Aún no tienes productos. Importa tu inventario y la IA empieza a trabajar para ti.", "/inventory", "Importar inventario");
  if (!s.has_forecast && s.revenue_30d > 0)
    add("norun", "info", 3, "Ya tienes ventas registradas: lanza tu primera predicción con IA y descubre cuánto venderás.", "/forecasting", "Predecir mis ventas");

  // 19 · seasonal (Peru retail calendar)
  if (month === 10 || month === 11)
    add("navidad", "info", 13, "Campaña navideña: adelanta tus compras de lo que más rota; los proveedores se demoran más en diciembre.", "/recommendations", "Planificar compras");
  else if (month === 6)
    add("fiestas", "info", 13, "Fiestas Patrias: julio suele mover más ventas. Revisa el stock de tus productos estrella.", "/inventory", "Revisar stock");

  // 20 · all clear
  if (tips.length === 0)
    add("ok", "success", 20, "Todo en orden: stock sano, ventas al día y nada urgente por comprar. Sigue registrando tus ventas para afinar las predicciones.", latestRun ? `/forecasting/${latestRun.id}` : "/forecasting", "Ver predicciones");

  return tips.sort((a, b) => a.rank - b.rank);
}
