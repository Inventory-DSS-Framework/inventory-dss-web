"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BrainCircuit, Check, LayoutDashboard } from "lucide-react";
import { useCompanyId } from "@/hooks/useCompanyId";
import { usePlan } from "@/hooks/usePlan";
import { billingPlansApi } from "@/lib/apis/billing";
import type { PaymentDTO } from "@/types/billing";
import { PremiumOverlay } from "@/components/premium/PremiumOverlay";
import { PREMIUM_FEATURES } from "@/components/premium/IntroScenes";
import { CYCLE_LABEL, METHOD_LABEL, fmtDate, fmtSoles, prefersReducedMotion } from "@/components/premium/plan-data";

type Style = React.CSSProperties & Record<`--${string}`, string>;
const d = (s: number): Style => ({ "--d": `${s}s` });

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <Success />
    </Suspense>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => {
        const r = (k: number) => {
          const x = Math.sin((i + 1) * 91.17 + k * 13.3) * 10000;
          return x - Math.floor(x);
        };
        const tones = ["var(--ps-hi)", "var(--ps-fg)", "var(--c-primary)", "var(--c-warning)"];
        return {
          left: `${r(1) * 100}%`,
          "--x": `${(r(2) - 0.5) * 220}px`,
          "--r": `${(r(3) - 0.5) * 1080}deg`,
          "--d": `${0.5 + r(4) * 0.9}s`,
          "--t": `${2.6 + r(5) * 1.8}s`,
          background: `rgb(${tones[i % tones.length]} / ${i % 4 === 1 ? 0.55 : 0.85})`,
          width: `${5 + r(6) * 5}px`,
          height: `${8 + r(7) * 8}px`,
        } as Style;
      }),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {pieces.map((s, i) => (
        <span key={i} className="ps-confetti" style={s} />
      ))}
    </div>
  );
}

function Success() {
  const router = useRouter();
  const ref = useSearchParams().get("ref") ?? "";
  const companyId = useCompanyId();
  const plan = usePlan();
  const [payment, setPayment] = useState<PaymentDTO | null>(null);
  const [reduced, setReduced] = useState(true);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  useEffect(() => {
    if (!companyId) return;
    billingPlansApi
      .payments(companyId)
      .then((list) => setPayment(list.find((p) => p.reference === ref) ?? null))
      .catch(() => undefined);
  }, [companyId, ref]);

  const end = plan.subscription?.current_period_end;

  return (
    <PremiumOverlay label="Pago confirmado" onClose={() => router.push("/dashboard")}>
      {!reduced && <Confetti />}
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
        <div className="relative h-28 w-28">
          <div className="ps-pop absolute inset-0 rounded-full" style={{ background: "rgb(var(--ps-hi) / 0.12)", boxShadow: "0 0 80px -10px rgb(var(--ps-hi) / 0.55)" }} />
          <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full">
            <circle cx="56" cy="56" r="46" pathLength={1} fill="none" stroke="rgb(var(--ps-hi))" strokeWidth="3" strokeLinecap="round" className="ps-draw" transform="rotate(-90 56 56)" style={{ "--d": "0.15s", "--t": "0.9s" } as Style} />
            <path d="M37 57.5 50 70l26-28" pathLength={1} fill="none" stroke="rgb(var(--ps-fg))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="ps-draw" style={{ "--d": "0.85s", "--t": "0.55s" } as Style} />
          </svg>
        </div>

        <p className="ps-fade mt-8 text-[11px] font-semibold uppercase tracking-[0.32em] ps-fg-3" style={d(1.1)}>Pago confirmado</p>
        <h1 className="ps-rise mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold tracking-[-0.035em] ps-fg" style={d(1.2)}>
          Bienvenido a <span className="ps-hi">Premium</span>.
        </h1>
        <p className="ps-rise mt-3 max-w-md text-sm ps-fg-2 sm:text-base" style={d(1.3)}>
          El La IA completa ya está activa para tu negocio.
        </p>

        <div className="ps-rise mt-7 w-full rounded-2xl p-4 text-left ps-glass" style={d(1.45)}>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-[11px] ps-fg-3">Referencia</p>
              <p className="font-mono text-[13px] ps-fg">{ref || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] ps-fg-3">Monto</p>
              <p className="tabular-nums ps-fg">{payment ? fmtSoles(payment.amount) : "—"}</p>
            </div>
            <div>
              <p className="text-[11px] ps-fg-3">Método</p>
              <p className="ps-fg">
                {payment ? `${METHOD_LABEL[payment.method] ?? payment.method}${payment.card_last4 ? ` •••• ${payment.card_last4}` : ""}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] ps-fg-3">{payment ? `${CYCLE_LABEL[payment.billing_cycle]} · renueva` : "Renueva"}</p>
              <p className="ps-fg">{end ? fmtDate(end) : "—"}</p>
            </div>
          </div>
          <p className="mt-3 border-t pt-3 text-[11px] ps-line ps-fg-3">Modo demostración — no se realizó ningún cargo real.</p>
        </div>

        <div className="mt-6 w-full text-left">
          <p className="ps-fade text-xs font-semibold uppercase tracking-wider ps-fg-3" style={d(1.55)}>Ahora tienes</p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PREMIUM_FEATURES.map((f, i) => (
              <li key={f.title} className="ps-rise flex items-center gap-2.5 text-sm ps-fg-2" style={d(1.6 + i * 0.07)}>
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: "rgb(var(--ps-hi) / 0.18)" }}>
                  <Check className="h-3 w-3 ps-hi" />
                </span>
                {f.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="ps-rise mt-9 flex flex-wrap items-center justify-center gap-3" style={d(2.1)}>
          <button onClick={() => router.push("/forecasting")} className="btn ps-btn-light group h-12 gap-2 rounded-2xl px-6 text-[15px]">
            <BrainCircuit className="h-4 w-4" /> Ir a la IA
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button onClick={() => router.push("/dashboard")} className="btn ps-btn-ghost h-12 gap-2 rounded-2xl px-5 text-sm">
            <LayoutDashboard className="h-4 w-4" /> Ir al panel
          </button>
        </div>
      </div>
    </PremiumOverlay>
  );
}
