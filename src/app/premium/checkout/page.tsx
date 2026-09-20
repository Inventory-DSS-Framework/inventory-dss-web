"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Crown, Info, Loader2, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanyId } from "@/hooks/useCompanyId";
import { usePlan } from "@/hooks/usePlan";
import { useRole } from "@/hooks/useRole";
import { companiesApi } from "@/lib/api";
import { billingPlansApi } from "@/lib/apis/billing";
import type { BillingCycle, CheckoutPayload, PaymentMethod, PlanDTO } from "@/types/billing";
import { PremiumOverlay } from "@/components/premium/PremiumOverlay";
import { CycleToggle } from "@/components/premium/PlanComparison";
import {
  CardForm,
  Field,
  MethodTabs,
  TransferPanel,
  YapePanel,
  psInputClass,
  validateCard,
  type CardState,
} from "@/components/premium/CheckoutMethods";
import {
  FALLBACK_PLANS,
  addCycle,
  fmtDate,
  fmtSoles,
  igvBreakdown,
  parseCycle,
  prefersReducedMotion,
  priceFor,
} from "@/components/premium/plan-data";

const STEPS = ["Validando", "Procesando pago", "Activando la IA"];

/** Plain-language guidance per payment method, shown next to the form and the summary. */
const METHOD_HINT: Record<PaymentMethod, { name: string; how: string; pending: string; activation: string }> = {
  card: {
    name: "tu tarjeta",
    how: "Visa, Mastercard, Amex o Diners. Solo validamos la tarjeta en tu navegador.",
    pending: "Completa la tarjeta",
    activation: "Activación inmediata",
  },
  yape: {
    name: "Yape",
    how: "Escanea el QR, paga y copia el código de aprobación de 6 dígitos que te da Yape.",
    pending: "Ingresa el código de Yape",
    activation: "Activación inmediata",
  },
  transferencia: {
    name: "transferencia bancaria",
    how: "Transfiere desde tu banco a una de nuestras cuentas y confirma aquí.",
    pending: "Confirma la transferencia",
    activation: "Activación al confirmar",
  },
};
const STEP_MS = 700;

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <Checkout />
    </Suspense>
  );
}

function Checkout() {
  const router = useRouter();
  const params = useSearchParams();
  const companyId = useCompanyId();
  const plan = usePlan();
  const { isAdmin } = useRole();

  const [cycle, setCycleState] = useState<BillingCycle>(parseCycle(params.get("cycle")));
  const [plans, setPlans] = useState<PlanDTO[]>(FALLBACK_PLANS);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [card, setCard] = useState<CardState>({ number: "", holder: "", expiry: "", cvv: "" });
  const [yapeCode, setYapeCode] = useState("");
  const [transferred, setTransferred] = useState(false);
  const [ruc, setRuc] = useState("");
  const [bizName, setBizName] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    billingPlansApi.plans().then((p) => p.length && setPlans(p)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    companiesApi
      .get(companyId)
      .then((c) => {
        setRuc((v) => v || (c.tax_id ?? ""));
        setBizName((v) => v || (c.name ?? ""));
      })
      .catch(() => undefined);
  }, [companyId]);

  const setCycle = (c: BillingCycle) => {
    setCycleState(c);
    router.replace(`/premium/checkout?cycle=${c}`, { scroll: false });
  };

  const premium = plans.find((p) => p.id === "premium") ?? FALLBACK_PLANS[1];
  const total = priceFor(premium, cycle);
  const { base, igv } = igvBreakdown(total);

  // Renewing an active premium extends from its current end.
  const renewal = useMemo(() => {
    const end = plan.subscription?.current_period_end ? new Date(plan.subscription.current_period_end) : null;
    const from = plan.isPremium && end && end.getTime() > Date.now() ? end : new Date();
    return addCycle(from, cycle);
  }, [plan.isPremium, plan.subscription, cycle]);

  const rucError = ruc && !/^(\d{8}|\d{11})$/.test(ruc) ? "RUC de 11 dígitos o DNI de 8" : null;
  const cardCheck = validateCard(card);
  const methodValid =
    method === "card" ? cardCheck.valid : method === "yape" ? /^\d{6}$/.test(yapeCode) : transferred;

  const close = useCallback(() => router.push("/premium"), [router]);

  const pay = async () => {
    setShowErrors(true);
    setError(null);
    if (!methodValid || rucError || !companyId) return;
    if (!isAdmin) {
      setError("Solo el propietario o un administrador puede contratar el plan.");
      return;
    }

    const body: CheckoutPayload = {
      plan_id: "premium",
      billing_cycle: cycle,
      method,
      billing_ruc: ruc || undefined,
      billing_name: bizName.trim() || undefined,
    };
    // Only brand + last4 + holder leave the browser. Never the full number or the CVV.
    if (method === "card" && cardCheck.brand) {
      body.card = { brand: cardCheck.brand, last4: cardCheck.last4, holder_name: card.holder.trim().toUpperCase() };
    }
    if (method === "yape") body.yape_code = yapeCode;

    const reduced = prefersReducedMotion();
    setStep(0);
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, reduced ? 0 : ms));
    try {
      const request = billingPlansApi.checkout(companyId, body);
      await wait(STEP_MS);
      setStep(1);
      const [result] = await Promise.all([request, wait(STEP_MS)]);
      setStep(2);
      await wait(STEP_MS);
      setCard({ number: "", holder: "", expiry: "", cvv: "" });
      plan.reload();
      router.replace(`/premium/success?ref=${encodeURIComponent(result.payment.reference)}`);
    } catch (e) {
      setStep(-1);
      setError(e instanceof Error ? e.message : "No se pudo procesar el pago");
    }
  };

  const processing = step >= 0;

  return (
    <PremiumOverlay label="Pago del plan Premium" onClose={processing ? () => undefined : close} closeOnEsc={!processing}>
      <div className="mx-auto w-full max-w-6xl px-5 pb-12 pt-4 sm:px-8">
        <div className="ps-fade flex flex-wrap items-center justify-between gap-3">
          <Link href="/premium" className="inline-flex items-center gap-1.5 text-sm ps-fg-2 hover:text-[rgb(var(--ps-fg))]">
            <ArrowLeft className="h-4 w-4" /> Volver a planes
          </Link>
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ps-glass" style={{ borderColor: "rgb(var(--c-warning) / 0.45)" }}>
            <Info className="h-3.5 w-3.5 text-warning" />
            <span className="ps-fg">Modo demostración — no se realiza ningún cargo real</span>
          </div>
        </div>

        <h1 className="ps-rise mt-6 font-display text-[clamp(1.7rem,3.6vw,2.6rem)] font-semibold tracking-[-0.03em] ps-fg">
          Activa <span className="ps-hi">Premium</span>
        </h1>

        {/* Where you are in the payment, at a glance */}
        <ol className="ps-rise mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" style={{ "--d": "0.04s" } as React.CSSProperties} aria-label="Pasos del pago">
          {[
            { label: "Plan elegido", detail: `${cycle === "yearly" ? "Anual" : "Mensual"} · ${fmtSoles(total)}`, done: true },
            { label: "Facturación", detail: rucError ? "Revisa el RUC/DNI" : ruc ? `RUC ${ruc}` : "Opcional", done: !rucError },
            { label: "Método de pago", detail: methodValid ? "Datos completos" : METHOD_HINT[method].pending, done: methodValid },
            { label: "Activación", detail: METHOD_HINT[method].activation, done: false },
          ].map((s, i, all) => {
            const current = !s.done && all.slice(0, i).every((p) => p.done);
            return (
              <li key={s.label} className={cn("flex items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-all", current ? "ps-glass-strong" : "ps-glass")}>
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                  style={{
                    background: s.done ? "rgb(var(--ps-hi))" : "rgb(var(--ps-fg) / 0.08)",
                    color: s.done ? "rgb(var(--ps-bg))" : "rgb(var(--ps-fg) / 0.7)",
                  }}
                >
                  {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-xs font-semibold", current || s.done ? "ps-fg" : "ps-fg-2")}>{s.label}</span>
                  <span className="block truncate text-[11px] ps-fg-3">{s.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Payment */}
          <section className="ps-rise ps-glass rounded-3xl p-5 sm:p-7" style={{ "--d": "0.08s" } as React.CSSProperties}>
            <h2 className="text-xs font-semibold uppercase tracking-wider ps-fg-3">Datos de facturación</h2>
            <div className="mt-3 grid gap-x-3 sm:grid-cols-[180px_1fr]">
              <Field label="RUC / DNI" error={rucError}>
                <input inputMode="numeric" value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))} className={psInputClass(!!rucError, "font-mono")} placeholder="20123456789" />
              </Field>
              <Field label="Razón social">
                <input value={bizName} onChange={(e) => setBizName(e.target.value.slice(0, 160))} className={psInputClass()} placeholder="Mi Empresa S.A.C." />
              </Field>
            </div>

            <h2 className="mt-3 text-xs font-semibold uppercase tracking-wider ps-fg-3">Método de pago</h2>
            <div className="mt-3">
              <MethodTabs value={method} onChange={(m) => { setMethod(m); setShowErrors(false); }} />
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-xs ps-fg-3">
              <Info className="h-3.5 w-3.5 shrink-0" /> {METHOD_HINT[method].how}
            </p>
            <div key={method} className="ps-scene-in mt-6">
              {method === "card" && <CardForm card={card} onChange={setCard} showErrors={showErrors} />}
              {method === "yape" && <YapePanel amount={total} code={yapeCode} onCode={setYapeCode} showErrors={showErrors} />}
              {method === "transferencia" && <TransferPanel amount={total} confirmed={transferred} onConfirm={setTransferred} showErrors={showErrors} />}
            </div>
          </section>

          {/* Summary */}
          <aside className="ps-rise lg:sticky lg:top-4 lg:self-start" style={{ "--d": "0.16s" } as React.CSSProperties}>
            <div className="ps-glass-strong rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "rgb(var(--ps-hi) / 0.16)" }}>
                  <Crown className="h-5 w-5 ps-hi" />
                </span>
                <div>
                  <p className="font-display font-semibold ps-fg">Plan Premium</p>
                  <p className="text-xs ps-fg-3">Motor de IA completo</p>
                </div>
              </div>

              <div className="mt-5 flex justify-center">
                <CycleToggle cycle={cycle} onChange={setCycle} savings={premium.yearly_savings} />
              </div>

              <dl className="mt-6 space-y-2.5 text-sm">
                <div className="flex justify-between ps-fg-2"><dt>Ciclo</dt><dd className="ps-fg">{cycle === "yearly" ? "Anual" : "Mensual"}</dd></div>
                <div className="flex justify-between ps-fg-2"><dt>Precio</dt><dd className="tabular-nums ps-fg">{fmtSoles(total)}</dd></div>
                {cycle === "yearly" && (
                  <div className="flex justify-between ps-fg-2"><dt>Ahorro vs. mensual</dt><dd className="tabular-nums ps-hi">−{fmtSoles(premium.yearly_savings)}</dd></div>
                )}
                <div className="my-3 border-t ps-line" />
                <div className="flex justify-between ps-fg-3"><dt>Valor de venta</dt><dd className="tabular-nums">{fmtSoles(base)}</dd></div>
                <div className="flex justify-between ps-fg-3"><dt>IGV (18%)</dt><dd className="tabular-nums">{fmtSoles(igv)}</dd></div>
                <div className="flex items-end justify-between pt-2">
                  <dt className="font-semibold ps-fg">Total</dt>
                  <dd key={`${cycle}-${total}`} className="ps-pop font-display text-3xl font-semibold tabular-nums ps-fg">{fmtSoles(total)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs ps-fg-3">
                IGV incluido. {plan.isPremium ? "Se extiende" : "Se renueva"} el {fmtDate(renewal)}. Cancela cuando quieras.
              </p>

              <button onClick={pay} disabled={processing} className="btn ps-btn-light mt-6 h-12 w-full gap-2 rounded-2xl text-[15px]">
                <Lock className="h-4 w-4" /> Pagar {fmtSoles(total)}
              </button>
              {showErrors && !methodValid && (
                <p className="mt-2 text-center text-xs text-danger">
                  {method === "card" ? "Revisa los datos de la tarjeta." : method === "yape" ? "Ingresa el código de aprobación de 6 dígitos." : "Confirma que ya realizaste la transferencia."}
                </p>
              )}
              {error && <p className="mt-2 text-center text-xs text-danger">{error}</p>}

              <div className="mt-5 rounded-2xl p-3.5 ps-glass">
                <p className="text-[11px] font-semibold uppercase tracking-wider ps-fg-3">Qué pasa al pagar</p>
                <ol className="mt-2.5 space-y-2 text-[13px] ps-fg-2">
                  {[
                    `Hoy se cobra ${fmtSoles(total)} con ${METHOD_HINT[method].name}.`,
                    `${METHOD_HINT[method].activation}: la IA pronostica todo tu catálogo.`,
                    `Recibes tu comprobante en Ajustes › Plan y pagos.`,
                    `${plan.isPremium ? "Se extiende" : "Se renueva"} el ${fmtDate(renewal)}. Puedes cancelar antes sin costo.`,
                  ].map((t, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ background: "rgb(var(--ps-hi) / 0.18)", color: "rgb(var(--ps-hi))" }}>{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs ps-fg-3">
                <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Nunca enviamos ni guardamos el número completo ni el CVV.</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Tus datos del ERP se mantienen igual.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {processing && <ProcessingLayer step={step} />}
    </PremiumOverlay>
  );
}

function ProcessingLayer({ step }: { step: number }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center px-6" style={{ background: "rgb(var(--ps-bg) / 0.78)", backdropFilter: "blur(14px)", animation: "ps-fade 0.3s ease-out both" }} role="status" aria-live="polite">
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto h-20 w-20">
          <svg viewBox="0 0 80 80" className="ps-spin absolute inset-0 h-full w-full">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(var(--ps-fg))" strokeOpacity="0.1" strokeWidth="3" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(var(--ps-hi))" strokeWidth="3" strokeLinecap="round" strokeDasharray="60 160" />
          </svg>
          <Lock className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 ps-fg" />
        </div>
        <ul className="mt-8 space-y-3 text-left">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-500", i <= step ? "ps-glass ps-fg" : "ps-fg-3 opacity-50")}>
              <span className="grid h-5 w-5 place-items-center">
                {i < step ? <Check className="h-4 w-4 ps-hi" /> : i === step ? <Loader2 className="h-4 w-4 animate-spin ps-hi" /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: "rgb(var(--ps-fg) / 0.4)" }} />}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
