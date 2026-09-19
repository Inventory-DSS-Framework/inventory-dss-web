/** Peruvian RUC validation (SUNAT módulo 11) — mirrors the backend's suppliers.domain.ruc. */

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const PREFIXES = ["10", "15", "17", "20"];

export function rucCheckDigit(firstTen: string): number {
  const sum = WEIGHTS.reduce((acc, w, i) => acc + Number(firstTen[i]) * w, 0);
  const digit = 11 - (sum % 11);
  return digit === 10 ? 0 : digit === 11 ? 1 : digit;
}

/** Spanish error message, or null when the RUC is valid. */
export function rucError(ruc: string): string | null {
  if (!/^\d{11}$/.test(ruc)) return "Debe tener 11 dígitos";
  if (!PREFIXES.includes(ruc.slice(0, 2))) return "Debe empezar con 10, 15, 17 o 20";
  if (rucCheckDigit(ruc.slice(0, 10)) !== Number(ruc[10])) return "El dígito verificador no coincide";
  return null;
}

export function rucKind(ruc: string): string {
  switch (ruc.slice(0, 2)) {
    case "10":
      return "Persona natural";
    case "20":
      return "Persona jurídica";
    case "15":
    case "17":
      return "Otros contribuyentes";
    default:
      return "";
  }
}
