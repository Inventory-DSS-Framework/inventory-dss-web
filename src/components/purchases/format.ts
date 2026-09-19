/** Formatting + costing helpers shared by the Compras and Proveedores screens. */

/** Peru's IGV. Costs are stored net of IGV (it is crédito fiscal). */
export const IGV_RATE = 0.18;

export const num = (v: number | string | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** yyyy-mm-dd → dd/mm/yyyy */
export const fmtDate = (iso?: string | null): string =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—";

/** Today's date in the user's local timezone as yyyy-mm-dd. */
export const todayISO = (): string => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const fmtQty = (n: number): string => n.toLocaleString("es-PE");

export const fmtPct = (v: number): string => `${(v * 100).toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`;

/** Same rule as the backend (inventory.domain.costing): negative stock carries no value. */
export function weightedAverage(onHand: number, currentAvg: number, quantity: number, unitCost: number): number {
  const stock = Math.max(onHand, 0);
  const total = stock + quantity;
  if (total <= 0) return round2(unitCost);
  return round2((stock * currentAvg + quantity * unitCost) / total);
}

export const round2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;
