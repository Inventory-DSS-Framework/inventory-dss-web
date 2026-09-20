/** Motor FTGM — ERP-scoped forecasting contract (preview, runs, overview, tracking). */

export type ScopeType = "recent_sales" | "supplier" | "seller" | "category" | "products" | "all";
export type FtgmFrequency = "auto" | "monthly" | "weekly";
export type Readiness = "listo" | "pocos_datos" | "sin_ventas" | "en_curso";
export type TrackingStatus = "en_linea" | "sobre_pronostico" | "bajo_pronostico" | "pendiente";
export type StockoutRisk = "alto" | "medio" | "bajo";

export interface ForecastScope {
  type: ScopeType;
  months?: number;
  supplier_id?: string;
  seller_id?: string;
  category_id?: string;
  product_ids?: string[];
}

export interface PreviewProduct {
  product_id: string;
  sku: string;
  name: string;
  unit_cost: number;
  on_hand: number;
  first_sale: string | null;
  last_sale: string | null;
  total_units: number;
  sales_count: number;
  stockout_days: number;
  lost_sale_attempts: number;
  lost_units: number;
  restocks_count: number;
  last_restock_date: string | null;
  last_restock_qty: number | null;
  movements_count: number;
  ledger_reliable: boolean;
  frequency: "monthly" | "weekly" | null;
  frequency_reason: string | null;
  periods: number;
  periods_with_data: number;
  avg_per_period: number;
  zero_share: number | null;
  stockout_periods: number;
  monthly_series: { period: string; units: number }[];
  readiness: Readiness;
  included: boolean;
  model_hint: string | null;
  reason: string;
  latest_run_id: string | null;
  latest_run_at: string | null;
}

export interface PreviewTotals {
  as_of: string;
  requested_frequency: FtgmFrequency;
  frequency: "monthly" | "weekly" | "mixed" | null;
  products_total: number;
  products_included: number;
  products_excluded: number;
  products_ready: number;
  products_low_data: number;
  total_data_points: number;
  max_periods: number;
  total_units: number;
  date_start: string | null;
  date_end: string;
  description: string;
  excluded: { product_id: string; name: string; reason: string }[];
}

export interface ScopePreview {
  scope: ForecastScope;
  totals: PreviewTotals;
  products: PreviewProduct[];
}

export interface RunSummary {
  total_forecast_units: number;
  next_period_units: number;
  products_ok: number;
  products_fallback: number;
  products_skipped: number;
  models: Record<string, number>;
  frequencies: Record<string, number>;
  median_holdout_mape: number | null;
  median_accuracy_pct?: number | null;
}

export interface FtgmRun {
  id: string;
  company_id: string;
  dataset_id: string | null;
  model_name: string;
  horizon_days: number;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string | null;
  scope: ForecastScope | null;
  scope_description: string | null;
  frequency: string | null;
  product_count: number;
  as_of: string | null;
  summary: RunSummary | null;
}

export interface HoldoutMetrics {
  origins: number;
  horizon: number;
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  mase: number | null;
  wape?: number | null;
  total_wape?: number | null;
}

/** One contender of the engine's model tournament, scored on the same past data. */
export interface CandidateScore {
  model: string;
  mae: number | null;
  wape: number | null;
  accuracy_pct: number | null;
  chosen: boolean;
}

export interface ProductDiagnostics {
  n_input_points?: number;
  n_periods?: number;
  stockout_periods?: number;
  imputed_periods?: number;
  validation_size?: number | null;
  order_scores?: Record<string, number | null>;
  validation_rmse?: number | null;
  frequency?: string | null;
  period?: number | null;
  frequency_reason?: string | null;
  history_start?: string | null;
  history_end?: string | null;
  dropped_incomplete_period?: boolean;
  outliers_cleaned?: number;
  zero_share?: number | null;
  intermittent?: boolean;
  seasonality_strength?: number | null;
  trend_pct_per_period?: number | null;
  max_order_allowed?: number | null;
  holdout?: HoldoutMetrics | null;
  naive_holdout?: HoldoutMetrics | null;
  skill_vs_naive?: number | null;
  interval_level?: number | null;
  /** Plain accuracy on past data: 100 − error of the horizon total (%). */
  accuracy_pct?: number | null;
  candidates?: CandidateScore[];
  forecast_vs_recent_pct?: number | null;
  explanations?: string[];
  warnings?: string[];
}

export interface OverviewProduct {
  product_id: string;
  sku: string;
  name: string;
  unit_cost: number;
  on_hand: number;
  lead_time_days: number;
  safety_stock: number;
  frequency: "monthly" | "weekly";
  status: "ok" | "fallback" | "skipped";
  model_used: string;
  order_selected: number;
  fallback_reason: string | null;
  metrics: {
    mape: string | number;
    mae: string | number;
    rmse: string | number;
    mase: string | number | null;
    rmsse: string | number | null;
  } | null;
  holdout: HoldoutMetrics | null;
  skill_vs_naive: number | null;
  accuracy_pct?: number | null;
  trend_pct: number | null;
  next_period: string | null;
  next_period_units: number;
  total_forecast_units: number;
  coverage_days: number | null;
  stockout_risk: StockoutRisk;
  needs_restock: boolean;
  suggested_qty: number;
  suggested_investment: number;
  recommendation_id: string | null;
}

export interface RunOverview {
  run: FtgmRun;
  summary: {
    total_forecast_units: number;
    next_period_units: number;
    products: number;
    products_need_restock: number;
    risk_high: number;
    risk_medium: number;
    suggested_investment: number;
    products_ok: number;
    products_fallback: number;
    products_skipped: number;
    accuracy_pct?: number | null;
  };
  preview: Partial<PreviewTotals> | null;
  products: OverviewProduct[];
  diagnostics: Record<string, ProductDiagnostics>;
}

export interface TrackingRow {
  period: string;
  period_end: string;
  forecast: number;
  lower: number | null;
  upper: number | null;
  actual: number | null;
  partial: boolean;
  elapsed_share: number;
  forecast_to_date: number | null;
  cum_forecast: number | null;
  cum_actual: number | null;
  within_band: boolean | null;
}

export interface ProductTracking {
  product_id: string;
  sku: string;
  name: string;
  frequency: "monthly" | "weekly";
  rows: TrackingRow[];
  periods_total: number;
  periods_elapsed: number;
  periods_complete: number;
  forecast_to_date: number;
  actual_to_date: number;
  mape: number | null;
  bias_pct: number | null;
  within_band_share: number | null;
  status: TrackingStatus;
}

export interface RunTracking {
  run_id: string;
  today: string;
  as_of: string | null;
  forecast_to_date: number;
  actual_to_date: number;
  bias_pct: number | null;
  products_on_track: number;
  products_over: number;
  products_under: number;
  products_pending: number;
  products: ProductTracking[];
}

export interface ProductRunEntry {
  run: FtgmRun;
  tracking: ProductTracking | null;
  diagnostics: ProductDiagnostics | null;
}

export interface InsightPeriod {
  period: string;
  partial: boolean;
  units: number;
  lost_units: number;
  stockout_days: number;
  restock_units: number;
  stock_end: number | null;
}

export interface ProductInsight {
  product_id: string;
  sku: string;
  name: string;
  frequency: "weekly" | "monthly";
  on_hand: number;
  safety_stock: number;
  reorder_point: number;
  ledger_reliable: boolean;
  restocks: { date: string; units: number }[];
  periods: InsightPeriod[];
  analysis: PreviewProduct;
}

export interface ErpSummary {
  today: string;
  revenue_today: number;
  units_today: number;
  revenue_7d: number;
  revenue_30d: number;
  units_30d: number;
  revenue_prev_30d: number;
  revenue_change_pct: number | null;
  tickets_today: number;
  tickets_30d: number;
  avg_ticket_30d: number | null;
  active_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock: { product_id: string; sku: string; name: string; on_hand: number; safety_stock: number; reorder_point: number }[];
  inventory_value: number;
  purchases_month_total: number;
  purchases_month_count: number;
  lost_sales_30d_attempts: number;
  lost_sales_30d_units: number;
  top_products: { product_id: string; sku: string; name: string; revenue: number; units: number }[];
  bottom_products: { product_id: string; sku: string; name: string; revenue: number; units: number; on_hand: number }[];
  gross_margin_30d: number;
  margin_pct_30d: number | null;
  sales_by_day: { date: string; revenue: number; units: number; tickets: number }[];
  has_forecast: boolean;
}

export interface CompanyUserLite {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  status: string;
}

export interface FtgmQuota {
  plan: "free" | "premium";
  monthly_limit: number | null;
  used: number;
  remaining: number | null;
}
