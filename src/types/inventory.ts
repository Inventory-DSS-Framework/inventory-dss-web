/** Inventory overview, valuation, adjustments, smart import and Product 360 timeline. */
import type { Numeric, ProductDTO } from "@/types/api";
import type { CustomAttributes } from "@/types/custom-fields";

export type StockStatus = "sin_stock" | "critico" | "reordenar" | "ok";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  sin_stock: "Sin stock",
  critico: "Crítico",
  reordenar: "Reordenar",
  ok: "OK",
};

export interface InventoryOverviewItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  barcode: string | null;
  image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_path: string[];
  unit_cost: Numeric;
  last_cost: Numeric | null;
  unit_price: Numeric;
  currency: string;
  unit_of_measure: string;
  lead_time_days: number;
  safety_stock: number;
  reorder_point: number;
  is_active: boolean;
  custom_attributes: CustomAttributes;
  stock_on_hand: number;
  stock_value: Numeric;
  retail_value: Numeric;
  status: StockStatus;
  last_movement_at: string | null;
  units_sold_30d: number;
  coverage_days: number | null;
  lost_sales_30d: number;
}

export interface InventoryTotals {
  products: number;
  units_on_hand: number;
  inventory_value_cost: Numeric;
  inventory_value_retail: Numeric;
  potential_margin: Numeric;
  status_counts: Record<StockStatus, number>;
}

export interface InventoryOverview {
  items: InventoryOverviewItem[];
  totals: InventoryTotals;
  generated_at: string;
}

export interface ValuationGroup {
  category_id: string | null;
  name: string;
  path: string[];
  products: number;
  units: number;
  value_cost: Numeric;
  value_retail: Numeric;
  share_pct: number;
}

export interface InventoryValuation {
  totals: InventoryTotals;
  by_category: ValuationGroup[];
  by_brand: ValuationGroup[];
}

export type AdjustmentMode = "set" | "delta";
export type AdjustmentReason = "conteo" | "merma" | "robo" | "vencido" | "otro";

export const ADJUSTMENT_REASON_LABEL: Record<AdjustmentReason, string> = {
  conteo: "Conteo físico",
  merma: "Merma",
  robo: "Robo o pérdida",
  vencido: "Producto vencido",
  otro: "Otro motivo",
};

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  movement_type: "inbound" | "outbound" | "adjustment";
  quantity: number;
  signed_quantity: number;
  reason: string;
  occurred_at: string;
  unit_cost: Numeric | null;
  reference_type: string | null;
  reference_id: string | null;
}

export interface AdjustmentResult {
  product_id: string;
  previous_stock: number;
  new_stock: number;
  delta: number;
  movement: StockMovement | null;
}

/** Body for create/update; SKU blank → next correlativo (P-000123). */
export interface ProductWriteBody {
  sku?: string | null;
  name?: string;
  description?: string;
  category_id?: string | null;
  unit_cost?: number;
  unit_price?: number;
  currency?: string;
  unit_of_measure?: string;
  lead_time_days?: number;
  safety_stock?: number;
  reorder_point?: number;
  is_active?: boolean;
  barcode?: string | null;
  image_url?: string | null;
  custom_attributes?: CustomAttributes;
  /** Create only: units on the shelf, posted as "Inventario inicial" at unit_cost. */
  initial_stock?: number;
}

export interface ProductImportRow {
  row?: number;
  sku?: string;
  barcode?: string;
  name: string;
  category?: string;
  unit_cost?: string | number;
  unit_price?: string | number;
  initial_stock?: string | number;
  safety_stock?: string | number;
  reorder_point?: string | number;
  lead_time_days?: string | number;
  unit_of_measure?: string;
  custom_attributes?: Record<string, string>;
}

export interface ProductImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
  categories_created: number;
}

// ─── Product 360 ────────────────────────────────────────────────────────────

export type TimelineKind = "sale" | "restock" | "adjustment" | "lost_sale";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  occurred_at: string;
  quantity: number;
  unit_price: Numeric | null;
  total: Numeric | null;
  order_id: string | null;
  order_number: number | null;
  batch_id: string | null;
  seller_name: string | null;
  unit_cost: Numeric | null;
  supplier_id: string | null;
  supplier_name: string | null;
  document_number: string | null;
  purchase_id: string | null;
  movement_type: string | null;
  signed_quantity: number | null;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  requested_quantity: number | null;
  available_quantity: number | null;
  source: string | null;
}

export interface TimelineStats {
  stock_on_hand: number;
  units_sold_30d: number;
  units_sold_90d: number;
  units_sold_365d: number;
  revenue_365d: Numeric;
  avg_price_365d: Numeric | null;
  gross_margin_pct: number | null;
  coverage_days: number | null;
  lost_sale_attempts: number;
  lost_units: number;
  lost_sale_attempts_30d: number;
  restock_count: number;
  last_restock_at: string | null;
  last_sale_at: string | null;
}

export interface ProductTimeline {
  product: ProductDTO;
  category_path: string[];
  stats: TimelineStats;
  events: TimelineEvent[];
  events_truncated: boolean;
  stock_series: { date: string; stock: number; inbound: number; outbound: number }[];
  monthly_sales: { month: string; units: number; revenue: Numeric }[];
}
