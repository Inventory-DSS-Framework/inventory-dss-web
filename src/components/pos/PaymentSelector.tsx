"use client";

import { ArrowRightLeft, Banknote, CheckCircle2, CreditCard, QrCode, ShieldAlert, Smartphone, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass, soles } from "@/lib/ui";
import { PAYMENT_LABEL, type PaymentMethod } from "@/types/pos";
import { toNumber } from "./cart";

const METHODS: { id: PaymentMethod; icon: LucideIcon; hint: string }[] = [
  { id: "efectivo", icon: Banknote, hint: "Da vuelto" },
  { id: "tarjeta", icon: CreditCard, hint: "POS" },
  { id: "yape", icon: QrCode, hint: "QR" },
  { id: "plin", icon: Smartphone, hint: "QR" },
  { id: "transferencia", icon: ArrowRightLeft, hint: "Banco" },
];

/** What the cashier has to do for each non-cash method, in order. */
const HOW_TO: Record<Exclude<PaymentMethod, "efectivo">, { title: string; steps: string[]; tip: string }> = {
  tarjeta: {
    title: "Cobro con tarjeta",
    steps: ["Digita el monto en el POS", "El cliente acerca o inserta su tarjeta", "Espera “Aprobado” y entrega el voucher"],
    tip: "Si el POS rechaza, cambia de método antes de cobrar.",
  },
  yape: {
    title: "Cobro con Yape",
    steps: ["Muestra tu QR de Yape", "El cliente paga el monto exacto", "Confirma la notificación en tu celular"],
    tip: "No aceptes capturas de pantalla: verifica el nombre y el monto en tu app.",
  },
  plin: {
    title: "Cobro con Plin",
    steps: ["Muestra tu QR de Plin", "El cliente paga el monto exacto", "Confirma la notificación en tu app del banco"],
    tip: "No aceptes capturas de pantalla: verifica el abono en tu app.",
  },
  transferencia: {
    title: "Cobro por transferencia",
    steps: ["Comparte tu número de cuenta o CCI", "El cliente transfiere el monto exacto", "Verifica el abono en tu banca antes de entregar"],
    tip: "Las transferencias interbancarias pueden tardar: entrega cuando veas el abono.",
  },
};

export function PaymentSelector({
  method,
  onMethod,
  received,
  onReceived,
  total,
}: {
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  received: string;
  onReceived: (v: string) => void;
  total: number;
}) {
  const receivedNum = toNumber(received);
  const change = receivedNum - total;
  const quick = Array.from(new Set([Math.ceil(total), Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100]))
    .filter((v) => v > 0)
    .slice(0, 4);

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">¿Cómo paga el cliente?</p>
        <p className="text-[11px] text-text-muted">A cobrar <span className="font-semibold tabular-nums text-text-primary">{soles(total)}</span></p>
      </div>

      <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-5 gap-1.5">
        {METHODS.map(({ id, icon: Icon, hint }) => {
          const on = method === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onMethod(id)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all",
                on
                  ? "border-primary/50 bg-primary-soft text-primary shadow-[0_0_0_3px_rgb(var(--c-primary)/0.12)]"
                  : "border-border bg-surface text-text-secondary hover:-translate-y-px hover:border-text-muted/30 hover:text-text-primary",
              )}
            >
              {on && <CheckCircle2 className="absolute right-1 top-1 h-3 w-3" />}
              <Icon className="h-[18px] w-[18px]" />
              <span className="text-[11.5px] font-semibold leading-none">{PAYMENT_LABEL[id]}</span>
              <span className={cn("text-[9.5px] leading-none", on ? "text-primary/70" : "text-text-muted")}>{hint}</span>
            </button>
          );
        })}
      </div>

      <div key={method} className="animate-fade-up">
        {method === "efectivo" ? (
          <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-surface-soft p-3">
            <label>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Recibo</span>
              <input
                value={received}
                onChange={(e) => onReceived(e.target.value.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                placeholder={total.toFixed(2)}
                className={inputClass(received !== "" && receivedNum < total, "text-right tabular-nums")}
              />
            </label>
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Vuelto a entregar</span>
              <div
                aria-live="polite"
                className={cn(
                  "flex h-[42px] items-center justify-end rounded-xl px-3.5 font-display text-lg font-bold tabular-nums transition-colors",
                  received === "" ? "bg-surface text-text-muted" : change < 0 ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
                )}
              >
                {received === "" ? "—" : change < 0 ? `Faltan ${soles(-change)}` : soles(change)}
              </div>
            </div>
            {quick.length > 0 && total > 0 && (
              <div className="col-span-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] text-text-muted">Billete rápido:</span>
                {quick.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onReceived(v.toFixed(2))}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors",
                      receivedNum === v ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:border-primary/30 hover:text-primary",
                    )}
                  >
                    {soles(v)}
                  </button>
                ))}
              </div>
            )}
            <p className="col-span-2 text-[10.5px] text-text-muted">Déjalo vacío si recibes el monto exacto.</p>
          </div>
        ) : (
          <HowTo method={method} total={total} />
        )}
      </div>
    </div>
  );
}

function HowTo({ method, total }: { method: Exclude<PaymentMethod, "efectivo">; total: number }) {
  const info = HOW_TO[method];
  return (
    <div className="rounded-2xl bg-surface-soft p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-primary">{info.title}</p>
        <p className="rounded-lg bg-surface px-2 py-0.5 text-xs font-bold tabular-nums text-text-primary ring-1 ring-border">Monto exacto {soles(total)}</p>
      </div>
      <ol className="mt-2.5 grid gap-1.5">
        {info.steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] text-text-muted">
        <ShieldAlert className="mt-px h-3 w-3 shrink-0 text-warning" /> {info.tip}
      </p>
    </div>
  );
}
