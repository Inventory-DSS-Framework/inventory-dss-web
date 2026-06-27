/** TypeScript mirrors of the backend DTOs. */

// Numeric fields that the backend serializes from Decimal may arrive as number
// or string depending on the serializer; coerce with Number() when displaying.
export type Numeric = number | string;

export interface TokenDTO {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type UserRole = "owner" | "admin" | "analyst" | "viewer";

export interface UserDTO {
  id: string;
  company_id: string;
  email: string;
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
  reason: string;
  occurred_at: string;
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

export interface ForecastMetricsDTO {
  run_id: string;
  product_id: string;
  mape: Numeric;
  mae: Numeric;
  rmse: Numeric;
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
  series: { product_id: string; point_count: number }[];
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

export interface ReportDTO {
  id: string;
  company_id: string;
  title: string;
  report_type: string;
  status: string;
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
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}
