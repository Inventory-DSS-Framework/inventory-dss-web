/** TypeScript mirrors of the backend DTOs. */

// Numeric fields that the backend serializes from Decimal may arrive as number
// or string depending on the serializer; coerce with Number() when displaying.
export type Numeric = number | string;

export interface TokenDTO {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type UserRole = "owner" | "admin" | "analyst" | "viewer" | "seller";

export interface UserDTO {
  id: string;
  company_id: string;
  /** Null for users that sign in with a username (sellers). */
  email: string | null;
  username: string | null;
  full_name: string;
  role: UserRole;
  status: string;
  last_login_at: string | null;
}

export interface CompanyDTO {
  id: string;
  name: string;
  tax_id: string;
  business_type: string;
  address: string;
  phone: string;
  email: string;
  plan: string;
  status: string;
}

export interface CategoryDTO {
  id: string;
  company_id: string;
  name: string;
  description: string;
  parent_id: string | null;
}

export interface ProductDTO {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  description: string;
  category_id: string | null;
  unit_cost: Numeric;
  unit_price: Numeric;
  currency: string;
  unit_of_measure: string;
  lead_time_days: number;
  safety_stock: number;
  reorder_point: number;
  is_active: boolean;
  barcode?: string | null;
  /** Data URL (compressed JPEG) or http(s) URL. */
  image_url?: string | null;
  custom_attributes?: Record<string, string | number | boolean | null>;
  /** Cost of the latest receipt; unit_cost is the weighted-average cost. */
  last_cost?: Numeric | null;
}

export interface SaleDTO {
  id: string;
  company_id: string;
  product_id: string;
  batch_id: string | null;
  sale_date: string;
  quantity: number;
  unit_price: Numeric;
  total_amount: Numeric;
  currency: string;
  /** POS ticket the line belongs to (null for imported history). */
  order_id?: string | null;
  seller_id?: string | null;
  seller_name?: string;
  /** Weighted-average cost at the moment of the sale. */
  unit_cost?: Numeric | null;
}

export interface SalesBatchDTO {
  id: string;
  company_id: string;
  source_file: string;
  status: string;
  row_count: number;
  period_start: string | null;
  period_end: string | null;
}

export type MovementType = "inbound" | "outbound" | "adjustment";

export interface MovementDTO {
  id: string;
  company_id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  /** Outbound movements are negative. */
  signed_quantity?: number;
  reason: string;
  occurred_at: string;
  unit_cost?: Numeric | null;
  reference_type?: string | null;
  reference_id?: string | null;
}

export interface StockLevelDTO {
  product_id: string;
  quantity_on_hand: number;
}

export interface ReplenishmentDTO {
  id: string;
  company_id: string;
  product_id: string;
  quantity: number;
  status: string;
}

export interface StockoutDTO {
  id: string;
  company_id: string;
  product_id: string;
  started_at: string;
  ended_at: string | null;
  duration_days: number | null;
}

export type RunStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled";

export interface ForecastRunDTO {
  id: string;
  company_id: string;
  dataset_id: string | null;
  model_name: string;
  horizon_days: number;
  status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export type ForecastProductStatus = "ok" | "fallback" | "skipped";

export interface ForecastMetricsDTO {
  run_id: string;
  product_id: string;
  mape: Numeric;
  mae: Numeric;
  rmse: Numeric;
  mase: Numeric | null;
  rmsse: Numeric | null;
  /** Fourier order chosen by Algorithm 1; 0 = baseline fallback. */
  order_selected: number;
  /** Model that actually produced the forecast ("FTGM" | "SeasonalNaive"). */
  model_used: string;
  status: ForecastProductStatus;
  fallback_reason: string | null;
  validation_rmse: Numeric | null;
}

export interface ForecastPointDTO {
  period_date: string;
  predicted_demand: Numeric;
  lower_bound: Numeric | null;
  upper_bound: Numeric | null;
}

/** One in-sample bucket: observed demand, cleaned (stockout-imputed) and model fit. */
export interface HistoryPointDTO {
  period_date: string;
  observed: Numeric;
  cleaned: Numeric;
  fitted: Numeric | null;
  is_stockout: boolean;
}

export interface ForecastResultDTO {
  id: string;
  run_id: string;
  company_id: string;
  product_id: string;
  points: ForecastPointDTO[];
  history: HistoryPointDTO[];
}

export type KpiType =
  | "coverage_days"
  | "stockout_risk"
  | "turnover"
  | "overstock_risk";

export interface KpiDTO {
  id: string;
  company_id: string;
  product_id: string;
  kpi_type: KpiType;
  value: Numeric;
  run_id: string | null;
  computed_at: string;
}

export type RecommendationPriority = "high" | "medium" | "low";
export type RecommendationStatus = "pending" | "accepted" | "dismissed";

export interface RecommendationDTO {
  id: string;
  company_id: string;
  product_id: string;
  recommended_quantity: number;
  priority: RecommendationPriority;
  reason: string;
  status: RecommendationStatus;
}

export interface IngestionBatchDTO {
  id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  column_mapping: Record<string, string>;
  status: string;
  row_count: number;
  error_count: number;
}

export interface PreparedDatasetDTO {
  id: string;
  company_id: string;
  source_batch_id: string | null;
  status: string;
  product_count: number;
  period_start: string | null;
  period_end: string | null;
  series: { product_id: string; point_count: number; has_stockout_flags: boolean; outliers_treated: boolean }[];
}

export interface MessageResponse {
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// --- Deferred modules --------------------------------------------------------
export interface NotificationDTO {
  id: string;
  company_id: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

export interface FileDTO {
  id: string;
  company_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  category: string;
}

export type ReportType = "forecast" | "kpi" | "recommendation";
export type ReportStatus = "pending" | "ready" | "failed";

export interface ReportDTO {
  id: string;
  company_id: string;
  title: string;
  report_type: ReportType;
  status: ReportStatus;
  file_path: string | null;
  params: Record<string, unknown>;
}

export interface ValidationRuleDTO {
  id: string;
  company_id: string;
  rule_name: string;
  rule_type: string;
  is_active: boolean;
}

export interface SystemSettingDTO {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface SubscriptionDTO {
  /** null for the implicit free plan (no subscription stored yet). */
  id: string | null;
  company_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  /** Premium access right now (active, or canceled but not expired). */
  is_premium?: boolean;
  /** Renews automatically at period end. */
  auto_renew?: boolean;
}

export interface SupplierDTO {
  id: string;
  company_id: string;
  ruc: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  is_active: boolean;
  /** Values for the company's custom supplier columns, keyed by field key. */
  custom_attributes: Record<string, string | number | boolean | null>;
  /** Purchase figures (filled by the list endpoint). */
  total_purchased: Numeric;
  purchase_lines: number;
  last_purchase_date: string | null;
}

export interface PurchaseDTO {
  id: string;
  company_id: string;
  supplier_id: string;
  product_id: string;
  purchase_date: string;
  quantity: number;
  /** Net of IGV. */
  unit_cost: Numeric;
  total_amount: Numeric;
  currency: string;
  /** Supplier's comprobante (e.g. F001-000123). */
  document_number: string;
  notes: string;
  /** Document id the line belongs to. */
  import_batch_id: string | null;
}

export type DocumentType = "boleta" | "factura";
export type ClientDocType = "dni" | "ruc" | "none";
export type InvoiceStatus = "emitida" | "anulada";

export interface InvoiceItemDTO {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: Numeric;
  discount?: Numeric;
  subtotal: Numeric;
}

export interface InvoiceDTO {
  id: string;
  company_id: string;
  document_type: DocumentType;
  series: string;
  correlativo: number;
  document_number: string;
  client_doc_type: ClientDocType;
  client_doc_number: string;
  client_name: string;
  client_address?: string;
  items: InvoiceItemDTO[];
  subtotal: Numeric;
  igv: Numeric;
  total: Numeric;
  currency: string;
  status: InvoiceStatus;
  issued_at: string;
  sale_id: string | null;
}
