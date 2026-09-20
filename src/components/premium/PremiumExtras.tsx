"use client";

import { useState } from "react";
import { ChevronDown, CreditCard, GitCompareArrows, Landmark, PackageSearch, ShoppingCart, Smartphone, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * The rest of the plans page: why Premium is worth it, how it gets paid, and the
 * questions people actually ask before paying. Sober on purpose — the showy part
 * lives in the intro, this is the page you come back to.
 */

const VALUE: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: PackageSearch, title: "Todo tu catálogo, no un producto", desc: "Una sola corrida cubre cada cosa que vendes, sin el límite de 3 al mes." },
  { icon: ShoppingCart, title: "Órdenes de compra listas", desc: "Cuánto pedir de cada producto, cuándo hacerlo y lo que te va a costar." },
  { icon: GitCompareArrows, title: "Sabes si la IA acertó", desc: "Comparamos lo pronosticado con lo que de verdad vendiste, mes a mes." },
];

export function ValueStrip() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {VALUE.map((v) => (
        <Card key={v.title} className="flex items-start gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-softer">
            <v.icon className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold text-text-primary">{v.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">{v.desc}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

const METHODS: { icon: LucideIcon; label: string }[] = [
  { icon: CreditCard, label: "Tarjeta" },
  { icon: Smartphone, label: "Yape" },
  { icon: Landmark, label: "Transferencia" },
];

export function PaymentRow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-surface-soft/60 px-5 py-4">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Formas de pago</span>
      {METHODS.map((m) => (
        <span key={m.label} className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <m.icon className="h-4 w-4 text-text-muted" /> {m.label}
        </span>
      ))}
      <span className="text-sm text-text-muted">· Factura a nombre de tu empresa</span>
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, desde esta misma pantalla y sin llamar a nadie. Sigues con Premium hasta que termine el periodo que ya pagaste; después vuelves al plan Gratis solo.",
  },
  {
    q: "Si vuelvo al plan Gratis, ¿pierdo algo?",
    a: "No. Tu ERP completo y todas tus predicciones anteriores siguen ahí. Lo único que regresa es el límite de 3 predicciones con IA al mes.",
  },
  {
    q: "¿Mensual o anual?",
    a: "El mensual no tiene permanencia: pagas un mes y ya. El anual es el mismo plan, solo que te salen dos meses gratis.",
  },
  {
    q: "¿La IA necesita muchos datos míos?",
    a: "Aprende de las ventas que ya registras en el sistema. Un producto necesita algunas semanas de historial para que valga la pena predecirlo; el resto te los marcamos como aún no disponibles.",
  },
];

export function PremiumFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <h2 className="text-center font-display text-lg font-semibold text-text-primary">Antes de decidir</h2>
      <Card className="overflow-hidden p-0">
        <div className="divide-y divide-border-soft">
          {FAQ.map((f, i) => {
            const on = open === i;
            return (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(on ? null : i)}
                  aria-expanded={on}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-soft"
                >
                  <span className="text-sm font-semibold text-text-primary">{f.q}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", on && "rotate-180")} />
                </button>
                {on && <p className="px-5 pb-4 text-sm leading-relaxed text-text-secondary">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
