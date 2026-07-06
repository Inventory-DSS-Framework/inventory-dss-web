/** Typed API functions per resource. Company-scoped calls take a companyId. */
import { apiClient } from "./api-client";
import type {
  CategoryDTO,
  CompanyDTO,
  FileDTO,
  ForecastRunDTO,
  ForecastMetricsDTO,
  ForecastResultDTO,
  IngestionBatchDTO,
  KpiDTO,
  MessageResponse,
  MovementDTO,
  NotificationDTO,
  PaginatedResponse,
  PreparedDatasetDTO,
  ProductDTO,
  RecommendationDTO,
  ReportDTO,
  ReportType,
  ReplenishmentDTO,
  SaleDTO,
  SalesBatchDTO,
  StockLevelDTO,
  StockoutDTO,
  SubscriptionDTO,
  SystemSettingDTO,
  UserDTO,
  ValidationRuleDTO,
} from "@/types/api";

const base = (companyId: string) => `/companies/${companyId}`;

export const authApi = {
  me: () => apiClient.get<UserDTO>("/auth/me"),
};

export const companiesApi = {
  get: (companyId: string) => apiClient.get<CompanyDTO>(`/companies/${companyId}`),
};

export const productsApi = {
  list: (companyId: string) =>
    apiClient.get<ProductDTO[]>(`${base(companyId)}/products`),
  get: (companyId: string, id: string) =>
    apiClient.get<ProductDTO>(`${base(companyId)}/products/${id}`),
  create: (companyId: string, body: Partial<ProductDTO>) =>
    apiClient.post<ProductDTO>(`${base(companyId)}/products`, body),
  update: (companyId: string, id: string, body: Partial<ProductDTO>) =>
    apiClient.patch<ProductDTO>(`${base(companyId)}/products/${id}`, body),
  remove: (companyId: string, id: string) =>
    apiClient.del<MessageResponse>(`${base(companyId)}/products/${id}`),
};

export const categoriesApi = {
  list: (companyId: string) =>
    apiClient.get<CategoryDTO[]>(`${base(companyId)}/product-categories`),
};

export const salesApi = {
  list: (companyId: string, page = 1, size = 50) =>
    apiClient.get<SaleDTO[]>(`${base(companyId)}/sales?page=${page}&size=${size}`),
  listByProduct: (companyId: string, productId: string, start: string, end: string) =>
    apiClient.get<SaleDTO[]>(
      `${base(companyId)}/sales/by-product/${productId}?start=${start}&end=${end}`,
    ),
  listBatches: (companyId: string) =>
    apiClient.get<SalesBatchDTO[]>(`${base(companyId)}/sales/batches`),
};

export const inventoryApi = {
  listMovements: (companyId: string) =>
    apiClient.get<MovementDTO[]>(`${base(companyId)}/inventory/movements`),
  currentStock: (companyId: string, productId: string) =>
    apiClient.get<StockLevelDTO>(
      `${base(companyId)}/inventory/current-stock/${productId}`,
    ),
  currentStockAll: (companyId: string) =>
    apiClient.get<StockLevelDTO[]>(`${base(companyId)}/inventory/current-stock`),
  listReplenishments: (companyId: string) =>
    apiClient.get<ReplenishmentDTO[]>(
      `${base(companyId)}/inventory/replenishments`,
    ),
  listStockouts: (companyId: string) =>
    apiClient.get<StockoutDTO[]>(`${base(companyId)}/inventory/stockouts`),
  detectStockouts: (companyId: string) =>
    apiClient.post<StockoutDTO[]>(
      `${base(companyId)}/inventory/stockouts/detect`,
    ),
};

export const forecastingApi = {
  listRuns: (companyId: string) =>
    apiClient.get<ForecastRunDTO[]>(`${base(companyId)}/forecast-runs`),
  getRun: (companyId: string, runId: string) =>
    apiClient.get<ForecastRunDTO>(`${base(companyId)}/forecast-runs/${runId}`),
  createRun: (companyId: string, body: { model_name?: string; horizon_days?: number; dataset_id?: string | null }) =>
    apiClient.post<ForecastRunDTO>(`${base(companyId)}/forecast-runs`, body),
  executeRun: (companyId: string, runId: string) =>
    apiClient.post<ForecastRunDTO>(
      `${base(companyId)}/forecast-runs/${runId}/execute`,
    ),
  runMetrics: (companyId: string, runId: string) =>
    apiClient.get<ForecastMetricsDTO[]>(
      `${base(companyId)}/forecast-runs/${runId}/metrics`,
    ),
  runResults: (companyId: string, runId: string) =>
    apiClient.get<ForecastResultDTO[]>(
      `${base(companyId)}/forecast-runs/${runId}/results`,
    ),
};

export const kpisApi = {
  list: (companyId: string) =>
    apiClient.get<KpiDTO[]>(`${base(companyId)}/kpis`),
  calculate: (companyId: string) =>
    apiClient.post<KpiDTO[]>(`${base(companyId)}/kpis/calculate`),
};

export const recommendationsApi = {
  list: (companyId: string, pendingOnly = false) =>
    apiClient.get<RecommendationDTO[]>(
      `${base(companyId)}/recommendations${pendingOnly ? "?pending_only=true" : ""}`,
    ),
  generate: (companyId: string) =>
    apiClient.post<RecommendationDTO[]>(
      `${base(companyId)}/recommendations/generate`,
    ),
  accept: (companyId: string, id: string) =>
    apiClient.post<RecommendationDTO>(
      `${base(companyId)}/recommendations/${id}/accept`,
    ),
  dismiss: (companyId: string, id: string) =>
    apiClient.post<RecommendationDTO>(
      `${base(companyId)}/recommendations/${id}/dismiss`,
    ),
};

export const ingestionApi = {
  listUploads: (companyId: string) =>
    apiClient.get<IngestionBatchDTO[]>(`${base(companyId)}/ingestion/uploads`),
  upload: (companyId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<IngestionBatchDTO>(
      `${base(companyId)}/ingestion/uploads`,
      form,
    );
  },
  setMapping: (companyId: string, uploadId: string, mapping: Record<string, string>) =>
    apiClient.post<IngestionBatchDTO>(
      `${base(companyId)}/ingestion/uploads/${uploadId}/mapping`,
      { mapping },
    ),
  validate: (companyId: string, uploadId: string) =>
    apiClient.post<IngestionBatchDTO>(
      `${base(companyId)}/ingestion/uploads/${uploadId}/validate`,
    ),
};

export const dataPreparationApi = {
  listDatasets: (companyId: string) =>
    apiClient.get<PreparedDatasetDTO[]>(
      `${base(companyId)}/data-preparation/datasets`,
    ),
  prepare: (companyId: string, batchId: string, treatZeroAsStockout = false) =>
    apiClient.post<PreparedDatasetDTO>(
      `${base(companyId)}/data-preparation/prepare`,
      { batch_id: batchId, treat_zero_as_stockout: treatZeroAsStockout },
    ),
};

export const notificationsApi = {
  list: (companyId: string) =>
    apiClient.get<PaginatedResponse<NotificationDTO>>(
      `${base(companyId)}/notifications`,
    ),
  markRead: (companyId: string, id: string) =>
    apiClient.post<MessageResponse>(
      `${base(companyId)}/notifications/${id}/mark-read`,
    ),
};

export const filesApi = {
  list: (companyId: string) =>
    apiClient.get<PaginatedResponse<FileDTO>>(`${base(companyId)}/files`),
};

export const reportsApi = {
  list: (companyId: string) =>
    apiClient.get<PaginatedResponse<ReportDTO>>(`${base(companyId)}/reports`),
  create: (
    companyId: string,
    body: { title: string; report_type: ReportType; params?: Record<string, unknown> },
  ) => apiClient.post<ReportDTO>(`${base(companyId)}/reports`, { params: {}, ...body }),
  download: (companyId: string, id: string) =>
    apiClient.getBlob(`${base(companyId)}/reports/${id}/download`),
};

export const validationApi = {
  listRules: (companyId: string) =>
    apiClient.get<ValidationRuleDTO[]>(`${base(companyId)}/validation/rules`),
  createRule: (
    companyId: string,
    body: { rule_name: string; rule_type: string; is_active?: boolean },
  ) => apiClient.post<ValidationRuleDTO>(`${base(companyId)}/validation/rules`, body),
  updateRule: (
    companyId: string,
    ruleId: string,
    body: { is_active?: boolean; rule_name?: string; rule_type?: string },
  ) => apiClient.patch<ValidationRuleDTO>(`${base(companyId)}/validation/rules/${ruleId}`, body),
};

export const billingApi = {
  subscription: (companyId: string) =>
    apiClient.get<SubscriptionDTO>(
      `${base(companyId)}/billing/subscription`,
    ),
};

export const adminApi = {
  systemSettings: () =>
    apiClient.get<SystemSettingDTO[]>("/admin/system/settings"),
};
