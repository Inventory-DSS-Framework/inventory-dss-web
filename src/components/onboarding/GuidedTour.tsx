"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOUR_EVENT, finishTour, isTourPending } from "@/lib/onboarding";

type TourStep = { target: string; title: string; body: string };

const STEPS: TourStep[] = [
  { target: "/dashboard", title: "Tu panel", body: "El resumen del día: ventas, stock crítico y tus próximos pasos. Siempre vuelves aquí." },
  { target: "/sales/new", title: "Nueva venta", body: "Tu caja. Busca o escanea productos y cobra con efectivo, tarjeta, Yape, Plin o transferencia." },
  { target: "/purchases/new", title: "Nueva compra", body: "Registra lo que compras a tus proveedores: sube tu stock y recalcula tu costo." },
  { target: "/inventory", title: "Inventario", body: "Stock en vivo, importación desde Excel con vista previa y el botón “Columnas” para personalizar por tipo de producto." },
  { target: "/products", title: "Catálogo", body: "Tus productos y tus tipos de producto (categorías). Las columnas propias se asignan a estos tipos." },
  { target: "/forecasting", title: "Predicciones con IA", body: "Te dice cuánto venderás y qué comprar. En el plan gratis tienes 3 predicciones al mes; con Premium, sin límites." },
  { target: "search", title: "Busca cualquier cosa", body: "Presiona Ctrl + K para saltar a cualquier módulo o acción sin usar el menú." },
  { target: "/settings", title: "Ajustes", body: "Apariencia, tu plan y tus pagos. Desde aquí también puedes repetir este recorrido." },
];

const PAD = 6;
const CARD_W = 320;

/** Coach marks over the real app: a spotlight that glides between nav items. */
export function GuidedTour() {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [, setViewport] = useState(0);

  useEffect(() => {
    const start = () => {
      if (!isTourPending()) return;
      setI(0);
      setActive(true);
    };
    const timer = window.setTimeout(start, 900);
    window.addEventListener(TOUR_EVENT, start);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(TOUR_EVENT, start);
    };
  }, []);

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[i]?.target}"]`);
    if (!el) return setRect(null);
    el.scrollIntoView({ block: "nearest" });
    setRect(el.getBoundingClientRect());
  }, [i]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    const onResize = () => {
      setViewport((v) => v + 1);
      measure();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, measure]);

  const close = useCallback(() => {
    finishTour();
    setActive(false);
  }, []);

  const next = useCallback(() => (i < STEPS.length - 1 ? setI(i + 1) : close()), [i, close]);
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, close]);

  if (!active) return null;

  const step = STEPS[i];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : { top: vh / 2, left: vw / 2, width: 0, height: 0 };

  const toRight = rect ? rect.right + 18 + CARD_W < vw : false;
  const card = rect
    ? toRight
      ? { left: rect.right + 18, top: Math.min(Math.max(16, rect.top + rect.height / 2 - 70), vh - 230) }
      : { left: Math.min(Math.max(16, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 16), top: Math.min(rect.bottom + 16, vh - 230) }
    : { left: vw / 2 - CARD_W / 2, top: vh / 2 - 100 };

  return createPortal(
    <div className="fixed inset-0 z-[250]" role="dialog" aria-modal="true" aria-label="Recorrido guiado">
      {/* Click-catcher so the app underneath isn't operated mid-tour */}
      <div className="absolute inset-0" onClick={next} />
      <div
        className="pointer-events-none fixed rounded-2xl transition-all duration-500 [transition-timing-function:var(--ease-out)]"
        style={{
          ...hole,
          boxShadow: "0 0 0 9999px rgb(var(--shadow-color) / 0.55), 0 0 0 2px rgb(var(--c-primary) / 0.9), 0 0 28px 4px rgb(var(--c-glow) / 0.45)",
        }}
      />
      <div
        key={i}
        className="fixed rounded-2xl border border-border bg-surface p-4 shadow-soft-xl"
        style={{ ...card, width: CARD_W, animation: "fade-up 0.4s var(--ease-out) both" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">Paso {i + 1} de {STEPS.length}</p>
            <p className="mt-1 font-display text-base font-semibold text-text-primary">{step.title}</p>
          </div>
          <button type="button" onClick={close} className="-mr-1 grid h-7 w-7 place-items-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text-primary" aria-label="Terminar recorrido">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, k) => (
              <span key={k} className={cn("h-1.5 rounded-full transition-all duration-300", k === i ? "w-5 bg-primary" : k < i ? "w-1.5 bg-primary/40" : "w-1.5 bg-surface-muted")} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {i > 0 && (
              <button type="button" onClick={prev} className="btn btn-ghost h-8 gap-1 px-2.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" /> Atrás
              </button>
            )}
            <button type="button" onClick={next} className="btn btn-primary h-8 gap-1 px-3 text-xs">
              {i === STEPS.length - 1 ? "Terminar" : "Siguiente"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
