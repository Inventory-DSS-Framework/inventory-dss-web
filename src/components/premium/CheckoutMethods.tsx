"use client";

import { useMemo, useState } from "react";
import { Check, Copy, CreditCard, Smartphone, Landmark, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardBrand, PaymentMethod } from "@/types/billing";
import {
  BRAND_LABEL,
  cardLength,
  cvvLength,
  detectBrand,
  expiryError,
  formatCardNumber,
  formatExpiry,
  luhn,
  onlyDigits,
} from "./card-utils";
import { fmtSoles } from "./plan-data";

/* ── Shared field ─────────────────────────────────────────────────────────── */

export function Field({ label, error, hint, children, className }: { label: string; error?: string | null; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium ps-fg-2">
        {label}
        {hint}
      </span>
      {children}
      <span className={cn("mt-1 block min-h-[16px] text-[11px]", error ? "text-danger" : "ps-fg-3")}>{error ?? ""}</span>
    </label>
  );
}

export function psInputClass(invalid?: boolean, extra?: string) {
  return cn(
    "ps-input w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-[box-shadow,border-color] placeholder:text-[rgb(var(--ps-fg)/0.35)]",
    "focus:shadow-[0_0_0_4px_rgb(var(--ps-hi)/0.15)] focus:border-[rgb(var(--ps-hi)/0.6)]",
    invalid && "border-danger/60 focus:border-danger/70 focus:shadow-[0_0_0_4px_rgb(var(--c-danger)/0.15)]",
    extra,
  );
}

/* ── Method tabs ──────────────────────────────────────────────────────────── */

const METHODS: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { id: "card", label: "Tarjeta", icon: CreditCard },
  { id: "yape", label: "Yape", icon: Smartphone },
  { id: "transferencia", label: "Transferencia", icon: Landmark },
];

export function MethodTabs({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  const idx = METHODS.findIndex((m) => m.id === value);
  return (
    <div role="tablist" aria-label="Método de pago" className="relative grid grid-cols-3 rounded-2xl p-1 ps-glass">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-xl transition-transform duration-500"
        style={{ background: "rgb(var(--ps-fg) / 0.1)", boxShadow: "inset 0 0 0 1px rgb(var(--ps-fg) / 0.12)", transform: `translateX(${idx * 100}%)`, transitionTimingFunction: "var(--ease-out)" }}
      />
      {METHODS.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={value === m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={cn("relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors", value === m.id ? "ps-fg" : "ps-fg-3 hover:text-[rgb(var(--ps-fg)/0.8)]")}
        >
          <m.icon className="h-4 w-4" /> {m.label}
        </button>
      ))}
    </div>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────────── */

export interface CardState {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export function validateCard(c: CardState) {
  const digits = onlyDigits(c.number);
  const brand = detectBrand(digits);
  const errors: Partial<Record<keyof CardState, string>> = {};
  if (!digits) errors.number = "Ingresa el número de tarjeta";
  else if (!brand) errors.number = "Aceptamos Visa, Mastercard, Amex y Diners";
  else if (digits.length !== cardLength(brand) || !luhn(digits)) errors.number = "Número de tarjeta inválido";
  if (c.holder.trim().length < 3) errors.holder = "Ingresa el nombre como figura en la tarjeta";
  const exp = expiryError(c.expiry);
  if (exp) errors.expiry = exp;
  if (onlyDigits(c.cvv).length !== cvvLength(brand)) errors.cvv = `${cvvLength(brand)} dígitos`;
  return { errors, brand, last4: digits.slice(-4), valid: Object.keys(errors).length === 0 };
}

function BrandMark({ brand }: { brand: CardBrand | null }) {
  if (!brand) return <span className="text-[11px] font-semibold tracking-wider ps-fg-3">TARJETA</span>;
  if (brand === "mastercard") {
    return (
      <svg viewBox="0 0 38 24" className="h-6 w-9" aria-label="Mastercard">
        <circle cx="14" cy="12" r="9" fill="rgb(var(--c-danger))" fillOpacity="0.9" />
        <circle cx="24" cy="12" r="9" fill="rgb(var(--c-warning))" fillOpacity="0.85" />
      </svg>
    );
  }
  const text = { visa: "VISA", amex: "AMEX", diners: "DINERS" }[brand];
  return <span className="font-display text-base font-bold italic tracking-wider ps-fg">{text}</span>;
}

export function CardForm({ card, onChange, showErrors }: { card: CardState; onChange: (c: CardState) => void; showErrors: boolean }) {
  const [touched, setTouched] = useState<Partial<Record<keyof CardState, boolean>>>({});
  const [flipped, setFlipped] = useState(false);
  const v = useMemo(() => validateCard(card), [card]);
  const err = (k: keyof CardState) => ((showErrors || touched[k]) && v.errors[k]) || null;
  const blur = (k: keyof CardState) => () => setTouched((t) => ({ ...t, [k]: true }));

  const digits = onlyDigits(card.number);
  const masked = formatCardNumber(digits.padEnd(cardLength(v.brand), "•")).replace(/\d(?=(?:[\d•\s]*){5})/g, (m) => m);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="order-2 lg:order-1">
        <Field
          label="Número de tarjeta"
          error={err("number")}
          hint={
            <button
              type="button"
              onClick={() => onChange({ number: "4242 4242 4242 4242", holder: card.holder || "Cliente Demo", expiry: "12/29", cvv: "123" })}
              className="inline-flex items-center gap-1 text-[11px] ps-hi hover:underline"
            >
              <Wand2 className="h-3 w-3" /> Usar tarjeta de prueba
            </button>
          }
        >
          <div className="relative">
            <input
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000 0000 0000 0000"
              value={card.number}
              onChange={(e) => onChange({ ...card, number: formatCardNumber(e.target.value) })}
              onBlur={blur("number")}
              className={psInputClass(!!err("number"), "pr-24 font-mono tracking-wider")}
              aria-invalid={!!err("number")}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold ps-fg-2">
              {v.brand ? BRAND_LABEL[v.brand] : ""}
            </span>
          </div>
        </Field>
        <Field label="Titular" error={err("holder")}>
          <input
            autoComplete="off"
            placeholder="Como figura en la tarjeta"
            value={card.holder}
            onChange={(e) => onChange({ ...card, holder: e.target.value.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñÜü .'-]/g, "").slice(0, 60) })}
            onBlur={blur("holder")}
            className={psInputClass(!!err("holder"), "uppercase")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vencimiento" error={err("expiry")}>
            <input
              inputMode="numeric"
              autoComplete="off"
              placeholder="MM/AA"
              value={card.expiry}
              onChange={(e) => {
                const raw = e.target.value;
                // Allow deleting the slash naturally.
                const next = raw.length < card.expiry.length ? raw.replace(/\/$/, "") : formatExpiry(raw);
                onChange({ ...card, expiry: next });
              }}
              onBlur={blur("expiry")}
              className={psInputClass(!!err("expiry"), "font-mono")}
            />
          </Field>
          <Field label="CVV" error={err("cvv")}>
            <input
              inputMode="numeric"
              autoComplete="off"
              type="password"
              placeholder={v.brand === "amex" ? "••••" : "•••"}
              value={card.cvv}
              onFocus={() => setFlipped(true)}
              onBlur={() => {
                setFlipped(false);
                blur("cvv")();
              }}
              onChange={(e) => onChange({ ...card, cvv: onlyDigits(e.target.value).slice(0, cvvLength(v.brand)) })}
              className={psInputClass(!!err("cvv"), "font-mono")}
            />
          </Field>
        </div>
      </div>

      {/* Live card preview */}
      <div className="order-1 lg:order-2" style={{ perspective: "1000px" }}>
        <div className="ps-flip relative mx-auto aspect-[1.586] w-full max-w-[300px]" data-flipped={flipped}>
          <div className="ps-face absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-4 ps-glass-strong">
            <div aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full" style={{ background: "rgb(var(--ps-hi) / 0.18)", filter: "blur(30px)" }} />
            <div className="relative flex items-start justify-between">
              <span className="h-7 w-9 rounded-md" style={{ background: "linear-gradient(135deg, rgb(var(--c-warning) / 0.75), rgb(var(--c-warning) / 0.4))" }} />
              <BrandMark brand={v.brand} />
            </div>
            <p className="relative font-mono text-[15px] tracking-[0.12em] ps-fg">{masked || "•••• •••• •••• ••••"}</p>
            <div className="relative flex items-end justify-between text-[10px] uppercase tracking-wider">
              <div className="min-w-0">
                <p className="ps-fg-3">Titular</p>
                <p className="truncate text-[12px] font-medium ps-fg">{card.holder || "Nombre Apellido"}</p>
              </div>
              <div className="text-right">
                <p className="ps-fg-3">Vence</p>
                <p className="font-mono text-[12px] ps-fg">{card.expiry || "MM/AA"}</p>
              </div>
            </div>
          </div>
          <div className="ps-face ps-face-back absolute inset-0 overflow-hidden rounded-2xl ps-glass-strong">
            <div className="mt-6 h-9" style={{ background: "rgb(var(--ps-bg) / 0.85)" }} />
            <div className="mx-4 mt-4 flex items-center justify-end gap-2">
              <div className="h-8 flex-1 rounded" style={{ background: "rgb(var(--ps-fg) / 0.12)" }} />
              <div className="grid h-8 w-14 place-items-center rounded font-mono text-sm ps-fg" style={{ background: "rgb(var(--ps-fg) / 0.9)", color: "rgb(var(--ps-bg))" }}>
                {card.cvv.replace(/./g, "•") || "CVV"}
              </div>
            </div>
            <p className="mx-4 mt-3 text-[10px] ps-fg-3">El CVV solo se valida en tu navegador.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Yape ─────────────────────────────────────────────────────────────────── */

function QrPlaceholder({ seed }: { seed: number }) {
  const N = 25;
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (inFinder(x, y)) continue;
        const r = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed) * 43758.5453;
        if (r - Math.floor(r) > 0.52) out.push([x, y]);
      }
    return out;
  }, [seed]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" rx="1.2" fill="rgb(var(--ps-bg))" />
      <rect x={x + 1} y={y + 1} width="5" height="5" rx="0.8" fill="rgb(var(--ps-fg))" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.6" fill="rgb(var(--ps-bg))" />
    </g>
  );
  return (
    <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} className="h-full w-full" role="img" aria-label="Código QR de demostración">
      <rect x="-2" y="-2" width={N + 4} height={N + 4} rx="3" fill="rgb(var(--ps-fg))" />
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" rx="0.25" fill="rgb(var(--ps-bg))" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
      <rect x={N / 2 - 2.5} y={N / 2 - 2.5} width="5" height="5" rx="1.2" fill="rgb(var(--ps-fg))" stroke="rgb(var(--ps-bg))" strokeWidth="0.6" />
      <path d={`M${N / 2 - 1.4} ${N / 2 + 0.8} l1 -1 l0.8 0.6 l1.4 -1.6`} fill="none" stroke="rgb(var(--ps-hi))" strokeWidth="0.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function YapePanel({ amount, code, onCode, showErrors }: { amount: number; code: string; onCode: (c: string) => void; showErrors: boolean }) {
  const invalid = showErrors && !/^\d{6}$/.test(code);
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr]">
      <div className="mx-auto w-[180px]">
        <div className="relative aspect-square rounded-2xl p-2 ps-glass-strong">
          <QrPlaceholder seed={amount} />
        </div>
        <p className="mt-2 text-center text-[11px] ps-fg-3">Escanea con Yape</p>
      </div>
      <div>
        <p className="text-xs ps-fg-3">Monto a yapear</p>
        <p className="font-display text-3xl font-semibold ps-fg">{fmtSoles(amount)}</p>
        <p className="mt-1 text-xs ps-fg-3">Destino: InventoryDSS S.A.C. · 987 654 321</p>
        <ol className="mt-4 space-y-1.5 text-[13px] ps-fg-2">
          <li>1. Abre Yape y escanea el código QR.</li>
          <li>2. Confirma el pago por {fmtSoles(amount)}.</li>
          <li>3. Copia el código de aprobación que te muestra Yape.</li>
        </ol>
        <Field label="Ingresa el código de aprobación de 6 dígitos" error={invalid ? "El código debe tener 6 dígitos" : null} className="mt-4">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            value={code}
            onChange={(e) => onCode(onlyDigits(e.target.value).slice(0, 6))}
            className={psInputClass(invalid, "text-center font-mono text-xl tracking-[0.6em]")}
            maxLength={6}
          />
        </Field>
      </div>
    </div>
  );
}

/* ── Transfer ─────────────────────────────────────────────────────────────── */

const BANKS = [
  { bank: "BCP", type: "Cuenta corriente soles", account: "193-2456789-0-31", cci: "002-193-002456789031-15" },
  { bank: "Interbank", type: "Cuenta corriente soles", account: "200-3004567891", cci: "003-200-003004567891-38" },
  { bank: "BBVA", type: "Cuenta corriente soles", account: "0011-0182-0100045678", cci: "011-182-000100045678-92" },
];

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value.replace(/-/g, "")).catch(() => undefined);
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
      className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium ps-btn-ghost"
      aria-label={`Copiar ${value}`}
    >
      {done ? <Check className="h-3 w-3 ps-hi" /> : <Copy className="h-3 w-3" />}
      {done ? "Copiado" : "Copiar"}
    </button>
  );
}

export function TransferPanel({ amount, confirmed, onConfirm, showErrors }: { amount: number; confirmed: boolean; onConfirm: (v: boolean) => void; showErrors: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs ps-fg-3">Monto a transferir</p>
          <p className="font-display text-3xl font-semibold ps-fg">{fmtSoles(amount)}</p>
        </div>
        <p className="text-xs ps-fg-3">Titular: InventoryDSS S.A.C. · RUC 20600000001</p>
      </div>
      <div className="mt-4 space-y-2">
        {BANKS.map((b) => (
          <div key={b.bank} className="rounded-2xl p-3.5 ps-glass">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold ps-fg">{b.bank}</p>
              <p className="text-[11px] ps-fg-3">{b.type}</p>
            </div>
            <div className="mt-2 grid gap-1.5 text-[13px] sm:grid-cols-2">
              <div className="flex items-center justify-between gap-2">
                <span className="ps-fg-3">Cuenta</span>
                <span className="flex items-center gap-2 font-mono ps-fg">{b.account} <CopyButton value={b.account} /></span>
              </div>
              <div className="flex items-center justify-between gap-2 sm:pl-3 sm:border-l ps-line">
                <span className="ps-fg-3">CCI</span>
                <span className="flex items-center gap-2 font-mono text-[12px] ps-fg">{b.cci} <CopyButton value={b.cci} /></span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <label className={cn("mt-4 flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 ps-glass", showErrors && !confirmed && "border-danger/60")}>
        <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} className="peer sr-only" />
        <span
          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:ring-2"
          style={{ borderColor: confirmed ? "rgb(var(--ps-hi))" : "rgb(var(--ps-fg) / 0.3)", background: confirmed ? "rgb(var(--ps-hi))" : "transparent" }}
        >
          {confirmed && <Check className="h-3.5 w-3.5" style={{ color: "rgb(var(--ps-bg))" }} />}
        </span>
        <span className="text-sm ps-fg-2">
          <span className="font-semibold ps-fg">Ya transferí {fmtSoles(amount)}</span>
          <span className="block text-xs ps-fg-3">Usa tu RUC como concepto. En producción se verificaría el abono antes de activar.</span>
        </span>
      </label>
    </div>
  );
}
