/** Motor FTGM API client: scope preview, scoped runs, overview, tracking, insight, dashboard. */
import { apiClient } from "@/lib/api-client";
import type {
  CompanyUserLite,
  FtgmQuota,
  ErpSummary,
  ForecastScope,
  FtgmFrequency,
  FtgmRun,
  ProductInsight,
  ProductRunEntry,
  RunOverview,
  RunTracking,
  ScopePreview,
} from "@/types/ftgm";

const runs = (companyId: string) => `/companies/${companyId}/forecast-runs`;

export const ftgmApi = {
  previewScope: (companyId: string, body: { scope: ForecastScope; frequency?: FtgmFrequency; as_of?: string }) =>
    apiClient.post<ScopePreview>(`${runs(companyId)}/scope-preview`, body),
  createRun: (
    companyId: string,
    body: { scope: ForecastScope; horizon_days: number; frequency?: FtgmFrequency; as_of?: string },
  ) => apiClient.post<FtgmRun>(runs(companyId), { model_name: "FTGM", ...body }),
  listRuns: (companyId: string, size = 50) => apiClient.get<FtgmRun[]>(`${runs(companyId)}?size=${size}`),
  getRun: (companyId: string, runId: string) => apiClient.get<FtgmRun>(`${runs(companyId)}/${runId}`),
  overview: (companyId: string, runId: string) => apiClient.get<RunOverview>(`${runs(companyId)}/${runId}/overview`),
  tracking: (companyId: string, runId: string) => apiClient.get<RunTracking>(`${runs(companyId)}/${runId}/tracking`),
  byProduct: (companyId: string, productId: string, limit = 5) =>
    apiClient.get<ProductRunEntry[]>(`${runs(companyId)}/by-product/${productId}?limit=${limit}`),
  productInsight: (companyId: string, productId: string, frequency: "weekly" | "monthly" = "weekly", periods = 52) =>
    apiClient.get<ProductInsight>(
      `${runs(companyId)}/product-insight/${productId}?frequency=${frequency}&periods=${periods}`,
    ),
  quota: (companyId: string) => apiClient.get<FtgmQuota>(`${runs(companyId)}/quota`),
  companyUsers: (companyId: string) => apiClient.get<CompanyUserLite[]>(`/companies/${companyId}/users?size=100`),
};

export const dashboardApi = {
  erpSummary: (companyId: string) => apiClient.get<ErpSummary>(`/companies/${companyId}/dashboard/erp-summary`),
};
