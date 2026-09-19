import type { CardBrand } from "@/types/billing";

/** Local-only card helpers. Nothing here is ever sent to the backend except brand + last4. */

export function detectBrand(digits: string): CardBrand | null {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^3(0[0-5]|[68])/.test(digits)) return "diners";
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "mastercard";
  return null;
}

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  diners: "Diners Club",
};

export function cardLength(brand: CardBrand | null): number {
  if (brand === "amex") return 15;
  if (brand === "diners") return 14;
  return 16;
}

export function cvvLength(brand: CardBrand | null): number {
  return brand === "amex" ? 4 : 3;
}

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

/** Groups: Amex 4-6-5, Diners 4-6-4, others 4-4-4-4. */
export function formatCardNumber(raw: string): string {
  const digits = onlyDigits(raw);
  const brand = detectBrand(digits);
  const d = digits.slice(0, cardLength(brand));
  if (brand === "amex" || brand === "diners") {
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(" ");
  }
  return d.replace(/(.{4})/g, "$1 ").trim();
}

export function luhn(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function formatExpiry(raw: string): string {
  const d = onlyDigits(raw).slice(0, 4);
  if (d.length <= 2) return d.length === 2 ? `${d}/` : d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** MM/AA, a real month, not in the past, at most 15 years ahead. */
export function expiryError(value: string, now = new Date()): string | null {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return "Usa el formato MM/AA";
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return "Mes inválido";
  const endOfMonth = new Date(year, month, 1);
  if (endOfMonth <= now) return "La tarjeta está vencida";
  if (year > now.getFullYear() + 15) return "Año inválido";
  return null;
}
