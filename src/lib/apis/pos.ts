/** POS (Nueva venta), Ventas and lost sales API. */
import { ApiError, apiClient, getAccessToken } from "@/lib/api-client";
import type {
  CatalogProduct,
  CreateSalesOrderBody,
  LostSale,
  SalesOrder,
  SalesOrderFilters,
  SalesOrderPage,
  SalesSummary,
  StockShortage,
} from "@/types/pos";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const base = (companyId: string) => `/companies/${companyId}`;

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

/** Checkout failure that keeps the backend's `details` (e.g. stock shortages on 409). */
export class CheckoutError extends ApiError {
  constructor(
    message: string,
    status: number,
    code: string | undefined,
    public readonly shortages: StockShortage[],
  ) {
    super(message, status, code);
    this.name = "CheckoutError";
  }
}

async function postCheckout(companyId: string, body: CreateSalesOrderBody): Promise<SalesOrder> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${base(companyId)}/sales-orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    // Let the shared client handle session expiry consistently.
    return apiClient.post<SalesOrder>(`${base(companyId)}/sales-orders`, body);
  }
  if (!res.ok) {
    let message = `Error ${res.status}`;
    let code: string | undefined;
    let shortages: StockShortage[] = [];
    try {
      const data = await res.json();
      message = data?.message ?? message;
      code = data?.code;
      shortages = Array.isArray(data?.details?.items) ? data.details.items : [];
    } catch {
      /* no JSON body */
    }
    throw new CheckoutError(message, res.status, code, shortages);
  }
  return (await res.json()) as SalesOrder;
}

export const posApi = {
  /** Exact barcode / SKU match (case-insensitive). 404 when nothing matches. */
  lookup: (companyId: string, code: string) =>
    apiClient.get<CatalogProduct>(`${base(companyId)}/sales-orders/lookup${qs({ code })}`),
  /** Active products by name / SKU / barcode / category, with stock on hand. */
  catalog: (companyId: string, q = "", limit = 20) =>
    apiClient.get<CatalogProduct[]>(`${base(companyId)}/sales-orders/catalog${qs({ q, limit })}`),
  checkout: postCheckout,
  list: (companyId: string, filters: SalesOrderFilters = {}) =>
    apiClient.get<SalesOrderPage>(
      `${base(companyId)}/sales-orders${qs(filters as Record<string, string | number | undefined>)}`,
    ),
  summary: (companyId: string, params: { date_from?: string; date_to?: string; seller_id?: string } = {}) =>
    apiClient.get<SalesSummary>(`${base(companyId)}/sales-orders/summary${qs(params)}`),
  get: (companyId: string, orderId: string) =>
    apiClient.get<SalesOrder>(`${base(companyId)}/sales-orders/${orderId}`),
  void: (companyId: string, orderId: string, reason = "") =>
    apiClient.post<SalesOrder>(`${base(companyId)}/sales-orders/${orderId}/void`, { reason }),
};

export interface SalesImportRowBody {
  row: number;
  code?: string;
  barcode?: string;
  name?: string;
  sale_date: string;
  quantity: string;
  unit_price?: string;
  seller_name?: string;
  document_number?: string;
  payment_method?: string;
  client_name?: string;
  client_doc?: string;
}

export interface SalesImportResult {
  batch_id: string | null;
  created: number;
  tickets: number;
  units: number;
  revenue: string | number;
  period_start: string | null;
  period_end: string | null;
  products: number;
  errors: { row: number; message: string }[];
}

/**
 * Sales from a spreadsheet. `affectStock=false` loads past sales as history (no stock
 * movement); `true` registers bulk sales that take stock out (rows over stock are rejected).
 */
export const salesHistoryApi = {
  import: (companyId: string, rows: SalesImportRowBody[], opts: { affectStock?: boolean; allowDuplicates?: boolean } = {}) =>
    apiClient.post<SalesImportResult>(`${base(companyId)}/sales/import`, {
      rows,
      affect_stock: opts.affectStock ?? false,
      allow_duplicates: opts.allowDuplicates ?? false,
    }),
};

export const lostSalesApi = {
  record: (companyId: string, body: { product_id: string; requested_quantity: number; available_quantity: number }) =>
    apiClient.post<LostSale>(`${base(companyId)}/lost-sales`, { ...body, source: "pos" }),
  list: (companyId: string, params: { product_id?: string; date_from?: string; date_to?: string } = {}) =>
    apiClient.get<LostSale[]>(`${base(companyId)}/lost-sales${qs(params)}`),
};
