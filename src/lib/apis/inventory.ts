import { apiClient } from "@/lib/api-client";
import type { ProductDTO } from "@/types/api";
import type {
  AdjustmentMode,
  AdjustmentReason,
  AdjustmentResult,
  InventoryOverview,
  InventoryValuation,
  ProductImportResult,
  ProductImportRow,
  ProductTimeline,
  ProductWriteBody,
  StockMovement,
} from "@/types/inventory";

const base = (companyId: string) => `/companies/${companyId}`;

/** Catalog writes with image, barcode, custom attributes and initial stock. */
export const catalogApi = {
  create: (companyId: string, body: ProductWriteBody) =>
    apiClient.post<ProductDTO>(`${base(companyId)}/products`, body),
  update: (companyId: string, id: string, body: ProductWriteBody) =>
    apiClient.patch<ProductDTO>(`${base(companyId)}/products/${id}`, body),
  import: (companyId: string, rows: ProductImportRow[], updateExisting: boolean) =>
    apiClient.post<ProductImportResult>(`${base(companyId)}/products/import`, {
      rows,
      update_existing: updateExisting,
    }),
  timeline: (companyId: string, id: string) =>
    apiClient.get<ProductTimeline>(`${base(companyId)}/products/${id}/timeline`),
};

export const stockApi = {
  overview: (companyId: string, includeInactive = false) =>
    apiClient.get<InventoryOverview>(
      `${base(companyId)}/inventory/overview${includeInactive ? "?include_inactive=true" : ""}`,
    ),
  valuation: (companyId: string) => apiClient.get<InventoryValuation>(`${base(companyId)}/inventory/valuation`),
  adjust: (
    companyId: string,
    body: { product_id: string; mode: AdjustmentMode; quantity: number; reason: AdjustmentReason; note?: string },
  ) => apiClient.post<AdjustmentResult>(`${base(companyId)}/inventory/adjustments`, body),
  /** Inbound with cost → recomputes the weighted-average cost. */
  receive: (companyId: string, body: { product_id: string; quantity: number; unit_cost?: number; reason?: string }) =>
    apiClient.post<StockMovement>(`${base(companyId)}/inventory/movements`, { movement_type: "inbound", ...body }),
};
