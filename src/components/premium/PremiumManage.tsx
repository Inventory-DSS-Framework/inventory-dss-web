"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, CalendarClock, Check, CreditCard, Crown, Loader2, Play, Receipt } from "lucide-react";
import type { SubscriptionDTO } from "@/types/api";
import type { PaymentDTO } from "@/types/billing";
import { CYCLE_LABEL, METHOD_LABEL, fmtDate, fmtSoles } from "./plan-data";
import { PREMIUM_FEATURES } from "./IntroScenes";

type Style = React.CSSProperties & Record<`--${string}`, string>;
const d = (s: number): Style => ({ "--d": `${s}s` });

interface Props {
  subscription: SubscriptionDTO;
  payments: PaymentDTO[] | null;
  canManage: boolean;
  onCancel: () => Promise<void>;
  onResume: () => Promise<void>;
  onReplay: () => void;
}

/** Calm "you're already premium" management view. */
export function PremiumManage({ subscription, payments, canManage, onCancel, onResume, onReplay }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canceled = subscription.status === "canceled";
  const last = payments?.[0];
  const end = new Date(subscription.current_period_end);
  const hasFutureEnd = end.getTime() > Date.now();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  };

  const tiles = [
    { icon: Crown, label: "Plan", value: `Premium${last ? ` · ${CYCLE_LABEL[last.billing_cycle] ?? ""}` : ""}` },
    {
      icon: CalendarClock,
      label: canceled ? "Acceso hasta" : "Próxima renovación",
      value: hasFutureEnd ? fmtDate(end) : "Sin fecha de corte",
    },
    {
      icon: CreditCard,
      label: "Último pago",
      value: last ? `${fmtSoles(last.amount)} · ${METHOD_LABEL[last.method] ?? last.method}${last.card_last4 ? ` •••• ${last.card_last4}` : ""}` : "Activación de demostración",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-14">
      <div className="text-center">
        <div className="ps-pop mx-auto grid h-14 w-14 place-items-center rounded-2xl ps-glass-strong" style={d(0)}>
          <Crown className="h-6 w-6 ps-hi" />
        </div>
        <p className="ps-fade mt-6 text-[11px] font-semibold uppercase tracking-[0.32em] ps-fg-3" style={d(0.1)}>
          {canceled ? "Renovación cancelada" : "Suscripción activa"}
        </p>
        <h1 className="ps-rise mt-3 font-display text-[clamp(2rem,5vw,3.6rem)] font-semibold tracking-[-0.035em] ps-fg" style={d(0.15)}>
          Ya eres <span className="ps-hi">Premium</span>.
        </h1>
        <p className="ps-rise mx-auto mt-3 max-w-lg text-sm ps-fg-2 sm:text-base" style={d(0.22)}>
          {canceled
            ? `Tu plan no se renovará. Conservas todas las predicciones con IA${hasFutureEnd ? ` hasta el ${fmtDate(end)}` : ""}.`
            : "El Motor de IA completo está trabajando para tu negocio."}
        </p>
        <div className="ps-rise mt-7 flex flex-wrap items-center justify-center gap-3" style={d(0.3)}>
          <Link href="/forecasting" className="btn ps-btn-light h-11 gap-2 rounded-xl px-5 text-sm">
            <BrainCircuit className="h-4 w-4" /> Ir a la IA <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={onReplay} className="btn ps-btn-ghost h-11 gap-2 rounded-xl px-4 text-sm">
            <Play className="h-3.5 w-3.5" /> Ver la presentación
          </button>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t, i) => (
          <div key={t.label} className="ps-rise ps-glass rounded-2xl p-4" style={d(0.38 + i * 0.08)}>
            <div className="flex items-center gap-2 text-xs ps-fg-3">
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </div>
            <p className="mt-2 text-[15px] font-semibold ps-fg">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="ps-rise mt-3 ps-glass rounded-2xl p-5" style={d(0.6)}>
        <p className="text-xs font-semibold uppercase tracking-wider ps-fg-3">Incluido en tu plan</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f.title} className="flex items-center gap-2.5 ps-fg-2">
              <Check className="h-4 w-4 shrink-0 ps-hi" /> {f.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="ps-rise mt-3 overflow-hidden ps-glass rounded-2xl" style={d(0.7)}>
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 text-xs font-semibold uppercase tracking-wider ps-fg-3">
          <Receipt className="h-3.5 w-3.5" /> Historial de pagos
        </div>
        {payments === null ? (
          <div className="px-5 pb-5 text-sm ps-fg-3">Cargando…</div>
        ) : payments.length === 0 ? (
          <div className="px-5 pb-5 text-sm ps-fg-3">Aún no hay pagos registrados. Tu plan se activó en modo demostración.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y ps-line text-left text-[11px] uppercase tracking-wider ps-fg-3">
                  <th className="px-5 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 font-medium">Referencia</th>
                  <th className="px-3 py-2.5 font-medium">Ciclo</th>
                  <th className="px-3 py-2.5 font-medium">Método</th>
                  <th className="px-3 py-2.5 text-right font-medium">Monto</th>
                  <th className="px-5 py-2.5 text-right font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="ps-divide">
                {payments.map((p) => (
                  <tr key={p.id} className="ps-fg-2">
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDate(p.paid_at)}</td>
                    <td className="px-3 py-3 font-mono text-[12px] ps-fg">{p.reference}</td>
                    <td className="px-3 py-3">{CYCLE_LABEL[p.billing_cycle] ?? p.billing_cycle}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {METHOD_LABEL[p.method] ?? p.method}
                      {p.card_last4 ? ` •••• ${p.card_last4}` : ""}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums ps-fg">{fmtSoles(p.amount)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgb(var(--ps-hi) / 0.14)", color: "rgb(var(--ps-hi))" }}>
                        {p.status === "paid" ? "Pagado" : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <div className="ps-fade mt-8 text-center" style={d(0.85)}>
          {canceled ? (
            hasFutureEnd && (
              <button onClick={() => run(onResume)} disabled={busy} className="btn ps-btn-ghost h-10 gap-2 rounded-xl px-4 text-sm">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Reactivar renovación automática
              </button>
            )
          ) : confirming ? (
            <div className="mx-auto max-w-md rounded-2xl p-4 ps-glass">
              <p className="text-sm ps-fg">¿Cancelar la renovación?</p>
              <p className="mt-1 text-xs ps-fg-3">Mantendrás Premium hasta el final del periodo actual. Luego tu cuenta vuelve al plan Gratis sin perder datos.</p>
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={() => setConfirming(false)} className="btn ps-btn-ghost h-9 rounded-lg px-3 text-sm">Mantener Premium</button>
                <button onClick={() => run(onCancel)} disabled={busy} className="btn h-9 gap-2 rounded-lg px-3 text-sm bg-danger/15 text-danger hover:bg-danger/25">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sí, cancelar renovación
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="text-sm underline-offset-4 ps-fg-3 hover:underline hover:text-[rgb(var(--ps-fg))]">
              Cancelar renovación
            </button>
          )}
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
