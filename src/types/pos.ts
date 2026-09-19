/** POS (Nueva venta), Ventas and lost sales — mirrors of the sales-orders API. */
import type { Numeric } from "@/types/api";

export type SalesDocumentType = "boleta" | "factura" | "nota_venta";
export type PosClientDocType = "dni" | "ruc" | "none";
export type PaymentMethod = "efectivo" | "tarjeta" | "yape" | "plin" | "transferencia";
export type OrderStatus = "completed" | "voided";

export const DOCUMENT_LABEL: Record<SalesDocumentType, string> = {
  boleta: "Boleta",
  factura: "Factura",
  nota_venta: "Nota de venta",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
};

/** Product as the till sees it (GET /sales-orders/lookup and /catalog). */
export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  barcode: string | null;
  image_url: string | null;
  unit_price: Numeric;
  currency: string;
  unit_of_measure: string;
  category_id: string | null;
  category_name: string | null;
  custom_attributes: Record<string, string | number | boolean | null>;
  stock_on_hand: number;
  reorder_point: number;
  safety_stock: number;
  is_active: boolean;
}

export interface SalesOrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount?: number;
}

export interface CreateSalesOrderBody {
  items: SalesOrderItemInput[];
  document_type: SalesDocumentType;
  client_doc_type: PosClientDocType;
  client_doc_number?: string;
  client_name?: string;
  client_address?: string;
  payment_method: PaymentMethod;
  amount_received?: number | null;
  notes?: string;
}

export interface SalesOrderLine {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: Numeric;
  discount: Numeric;
  line_total: Numeric;
  unit_cost: Numeric | null;
}

export interface SalesOrder {
  id: string;
  company_id: string;
  order_number: number;
  document_type: SalesDocumentType;
  /** B001-00000012 / F001-00000003 / NV-000045 */
  document_number: string;
  invoice_id: string | null;
  invoice_status: "emitida" | "anulada" | null;
  client_doc_type: PosClientDocType;
  client_doc_number: string;
  client_name: string;
  client_address: string;
  seller_id: string | null;
  seller_name: string;
  payment_method: PaymentMethod;
  amount_received: Numeric | null;
  change: Numeric | null;
  discount_total: Numeric;
  subtotal: Numeric;
  igv: Numeric;
  total: Numeric;
  currency: string;
  items_count: number;
  units: number;
  cost_total: Numeric;
  gross_margin: Numeric;
  status: OrderStatus;
  notes: string;
  sold_at: string;
  lines: SalesOrderLine[];
}

export interface SalesOrderRow {
  id: string;
  order_number: number;
  sold_at: string;
  document_type: SalesDocumentType;
  document_number: string;
  invoice_status: "emitida" | "anulada" | null;
  client_doc_type: PosClientDocType;
  client_doc_number: string;
  client_name: string;
  seller_id: string | null;
  seller_name: string;
  payment_method: PaymentMethod;
  items_count: number;
  units: number;
  subtotal: Numeric;
  igv: Numeric;
  total: Numeric;
  cost_total: Numeric;
  margin: Numeric;
  status: OrderStatus;
}

export interface SalesOrderPage {
  items: SalesOrderRow[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SalesOrderFilters {
  date_from?: string;
  date_to?: string;
  seller_id?: string;
  document_type?: SalesDocumentType;
  status?: OrderStatus;
  q?: string;
  page?: number;
  size?: number;
}

/** Revenue includes IGV; gross_margin = revenue_net (without IGV) − Σ qty × unit_cost. */
export interface SalesSummary {
  date_from: string;
  date_to: string;
  revenue: Numeric;
  revenue_net: Numeric;
  igv: Numeric;
  orders: number;
  avg_ticket: Numeric;
  units: number;
  cost_total: Numeric;
  gross_margin: Numeric;
  margin_pct: Numeric;
  voided_orders: number;
  by_payment_method: { payment_method: PaymentMethod; orders: number; total: Numeric }[];
  by_seller: { seller_id: string | null; seller_name: string; orders: number; units: number; total: Numeric }[];
  by_document_type: { document_type: SalesDocumentType; orders: number; total: Numeric }[];
  by_day: { date: string; orders: number; total: Numeric }[];
  top_products: { product_id: string; name: string; sku: string; units: number; total: Numeric }[];
}

export interface LostSale {
  id: string;
  company_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  requested_quantity: number;
  available_quantity: number;
  seller_id: string | null;
  seller_name: string;
  source: string;
  occurred_at: string;
}

/** 409 body details when a checkout line exceeds stock. */
export interface StockShortage {
  product_id: string;
  name: string;
  sku: string;
  requested: number;
  available: number;
}
