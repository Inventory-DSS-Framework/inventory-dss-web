import type { CatalogProduct } from "@/types/pos";
import { splitIgv } from "./peru";

export interface CartLine {
  product: CatalogProduct;
  quantity: number;
  /** Kept as text so the cashier can type freely ("12.", "") without the input jumping. */
  unitPrice: string;
  discount: string;
}

export const toNumber = (v: string | number | null | undefined) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function lineGross(line: CartLine): number {
  return line.quantity * toNumber(line.unitPrice);
}

export function lineTotal(line: CartLine): number {
  return Math.max(0, lineGross(line) - toNumber(line.discount));
}

export function cartTotals(lines: CartLine[]) {
  const total = lines.reduce((acc, l) => acc + lineTotal(l), 0);
  const discount = lines.reduce((acc, l) => acc + Math.min(toNumber(l.discount), lineGross(l)), 0);
  const units = lines.reduce((acc, l) => acc + l.quantity, 0);
  return { ...splitIgv(total), discount, units };
}

export function newLine(product: CatalogProduct, quantity = 1): CartLine {
  return { product, quantity, unitPrice: Number(product.unit_price).toFixed(2), discount: "" };
}
