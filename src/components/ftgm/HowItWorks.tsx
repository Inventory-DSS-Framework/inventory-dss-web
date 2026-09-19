"use client";

import { useState } from "react";
import { CalendarSearch, ChevronDown, HelpCircle, LineChart, ShieldCheck, ShoppingCart } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useExpertMode } from "@/hooks/useExpertMode";

const STEPS = [
  {
    icon: CalendarSearch,
    title: "1 · Leemos tus ventas pasadas",
    body: "Juntamos lo que vendiste de cada producto por semana o por mes. Si un día te quedaste sin stock, lo tomamos en cuenta para no leer ese cero como «no se vende».",
  },
  {
    icon: LineChart,
    title: "2 · Buscamos tu patrón",
    body: "Detectamos si un producto sube, baja o tiene temporadas (Navidad, campañas, fines de mes). Varios métodos de cálculo compiten por cada producto, incluido nuestro motor FTGM, que está hecho para ventas con temporadas.",
  },
  {
    icon: ShieldCheck,
    title: "3 · Lo probamos con tu propio pasado",
    body: "Escondemos tus últimos meses de ventas, le pedimos a cada método que los «adivine» y comparamos con lo que de verdad vendiste. El que mejor acierta con TU producto es el que usamos, y de ahí sale el «acierta ~X%» que te mostramos.",
  },
  {
    icon: ShoppingCart,
    title: "4 · Lo convertimos en decisiones",
    body: "Con lo que venderías, tu stock actual, lo que demora tu proveedor y un margen de seguridad, te decimos qué comprar ya, qué puede esperar y de qué estás pidiendo de más.",
  },
];

/** "¿Cómo funciona?" — the engine explained in plain words, with a technical layer for expert mode. */
export function HowItWorksButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [expert] = useExpertMode();
  const [tech, setTech] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text-secondary transition-colors hover:border-accent-violet/40 hover:text-text-primary",
          className,
        )}
      >
        <HelpCircle className="h-4 w-4 text-accent-violet" /> ¿Cómo funciona?
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="¿Cómo calculamos cuánto venderás?"
        description="Sin magia: son tus propias ventas, puestas a prueba."
        size="lg"
      >
        <div className="space-y-3">
          {STEPS.map((s) => (
            <div key={s.title} className="flex items-start gap-3.5 rounded-2xl border border-border bg-surface-soft/60 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-violet-soft text-accent-violet">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-text-primary">{s.title}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{s.body}</p>
              </div>
            </div>
          ))}

          <p className="px-1 text-xs text-text-muted">
            Mientras más semanas de ventas registres, mejor acierta. Con productos nuevos o de venta muy esporádica, el
            cálculo sirve como referencia y te lo decimos con claridad.
          </p>

          {expert && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setTech((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text-primary"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", tech && "rotate-180")} />
                Detalle técnico (Modo experto)
              </button>
              {tech && (
                <div className="mt-3 space-y-2 rounded-2xl border border-border bg-surface-soft/60 p-4 text-sm text-text-secondary">
                  <p>
                    <span className="font-semibold text-text-primary">FTGM</span> (Fourier Time-Varying Grey Model): modela la
                    demanda con una ecuación diferencial cuyos coeficientes varían en el tiempo como series de Fourier — así
                    captura tendencia y estacionalidad a la vez. El orden armónico y la regularización (ridge) se eligen por
                    validación sobre tu propia serie.
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">Torneo de modelos:</span> FTGM compite contra métodos de
                    referencia (suavizado exponencial amortiguado, estacional y «temporada anterior») en validación
                    rolling-origin: se re-entrena en varios cortes del pasado y se puntúa sobre periodos que no vio. Gana el de
                    menor error; en empate cercano, preferimos el FTGM.
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">Precisión:</span> «acierta ~X%» = 100 − WAPE del
                    total por horizonte en esa validación (el error que importa al reponer: cuántas unidades venderás en el
                    periodo). Con muy pocas unidades vendidas el porcentaje no es fiable y no lo mostramos.
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">Demanda esporádica:</span> si más de la mitad de los
                    periodos no registran ventas, usamos Croston-SBA, el método estándar para demanda intermitente.
                  </p>
                  <p>
                    <span className="font-semibold text-text-primary">Reglas de compra:</span> comprar cuando el stock no cubre
                    (tiempo de entrega + 14 días) × venta diaria + stock mínimo; la cantidad sugerida cubre además un mes de
                    venta. Sobre-stock recién a partir de ~4 meses de cobertura.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
