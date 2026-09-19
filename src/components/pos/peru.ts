/** Peru retail rules used at the till (mirror of the backend's invoicing domain). */

export const IGV_RATE = 0.18;
/** SUNAT: boletas of S/ 700 or more must identify the buyer (DNI + name). */
export const BOLETA_ID_THRESHOLD = 700;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Prices include IGV: Op. gravada = Total / 1.18, IGV = Total − Op. gravada. */
export function splitIgv(total: number): { subtotal: number; igv: number; total: number } {
  const t = round2(total);
  const subtotal = round2(t / (1 + IGV_RATE));
  return { subtotal, igv: round2(t - subtotal), total: t };
}

export function isValidDni(value: string): boolean {
  return /^\d{8}$/.test(value);
}

/** 11 digits, prefix 10/15/17/20 and a valid módulo-11 check digit. */
export function isValidRuc(value: string): boolean {
  if (!/^\d{11}$/.test(value) || !["10", "15", "17", "20"].includes(value.slice(0, 2))) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(value[i]), 0);
  let check = 11 - (sum % 11);
  if (check === 10) check = 0;
  if (check === 11) check = 1;
  return check === Number(value[10]);
}

const UNITS = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ",
  "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE",
  "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const TENS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const HUNDREDS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS",
  "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = HUNDREDS[h];
  if (rest > 0) {
    let part: string;
    if (rest < 30) part = UNITS[rest];
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      part = TENS[t] + (u ? ` Y ${UNITS[u]}` : "");
    }
    out = out ? `${out} ${part}` : part;
  }
  return out;
}

function integerToWords(n: number): string {
  if (n === 0) return "CERO";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? "UN MILLÓN" : `${below1000(millions).replace(/UNO$/, "UN")} MILLONES`);
  if (thousands) parts.push(thousands === 1 ? "MIL" : `${below1000(thousands).replace(/UNO$/, "UN")} MIL`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

/** "SON: CIENTO VEINTE CON 50/100 SOLES" — printed on every Peruvian comprobante. */
export function amountInWords(amount: number): string {
  const cents = Math.round(amount * 100);
  const soles = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `SON: ${integerToWords(soles)} CON ${rest}/100 SOLES`;
}
