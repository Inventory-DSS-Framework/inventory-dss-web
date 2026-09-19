/** Compras (purchase documents) and supplier detail types. */
import type { Numeric, PurchaseDTO, SupplierDTO } from "@/types/api";
import type { CustomAttributes } from "@/types/custom-fields";

export interface ImportRowError {
  row: number;
  message: string;
}

// ─── Suppliers ────────────────────────────────────────────────────────────

export interface SupplierInput {
  ruc: string;
  business_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  custom_attributes?: CustomAttributes;
}

export interface SuppliedProductDTO {
  product_id: string;
  sku: string;
  name: string;
  total_quantity: number;
  total_amount: Numeric;
  avg_unit_cost: Numeric;
  last_cost: Numeric | null;
  last_purchase_date: string | null;
}

export interface SupplierPurchaseLineDTO {
  id: string;
  document_id: string | null;
  document_number: string;
  purchase_date: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost: Numeric;
  total_amount: Numeric;
}

export interface SupplierSummaryDTO {
  supplier: SupplierDTO;
  total_purchased: Numeric;
  purchases_count: number;
  documents_count: number;
  last_purchase_date: string | null;
  products_count: number;
  products: SuppliedProductDTO[];
  recent_lines: SupplierPurchaseLineDTO[];
}

export interface SupplierImportRow {
  row?: number;
  ruc: string;
  business_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  custom_attributes?: CustomAttributes;
}

export interface SupplierImportResultDTO {
  created: number;
  updated: number;
  skipped: number;
  errors: ImportRowError[];
}

// ─── Purchases ────────────────────────────────────────────────────────────

export interface PurchaseCatalogItemDTO {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category_id: string | null;
  /** Weighted-average cost (net of IGV). */
  unit_cost: Numeric;
  last_cost: Numeric | null;
  unit_price: Numeric;
  stock_on_hand: number;
  is_active: boolean;
}

export interface NewProductInput {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit_price?: number | null;
  category_id?: string | null;
  custom_attributes?: CustomAttributes;
}

export interface PurchaseBatchItemInput {
  product_id?: string | null;
  new_product?: NewProductInput | null;
  quantity: number;
  unit_cost: number;
}

export interface PurchaseBatchInput {
  supplier_id: string;
  purchase_date: string;
  document_number?: string;
  notes?: string;
  /** Typed costs include 18% IGV; the API stores them net (÷ 1.18). */
  costs_include_igv?: boolean;
  items: PurchaseBatchItemInput[];
}

export interface NewProductResultDTO {
  row: number | null;
  product_id: string;
  name: string;
  sku: string;
}

export interface StockChangeDTO {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  previous_avg_cost: Numeric;
  new_avg_cost: Numeric;
}

export interface PurchaseBatchResultDTO {
  batch_id: string;
  document_number: string;
  purchase_date: string;
  costs_include_igv: boolean;
  lines: PurchaseDTO[];
  new_products: NewProductResultDTO[];
  stock_changes: StockChangeDTO[];
  units: number;
  subtotal: Numeric;
  igv: Numeric;
  total: Numeric;
}

export interface PurchaseImportRowInput {
  row?: number;
  code?: string;
  barcode?: string;
  name?: string;
  quantity: string | number;
  unit_cost: string | number;
  unit_price?: string | number;
  purchase_date?: string;
  document_number?: string;
  custom_attributes?: CustomAttributes;
}

export interface PurchaseImportInput {
  supplier_id: string;
  purchase_date: string;
  document_number?: string;
  notes?: string;
  create_missing_products?: boolean;
  costs_include_igv?: boolean;
  rows: PurchaseImportRowInput[];
}

export interface PurchaseImportResultDTO {
  batch_id: string | null;
  batch_ids: string[];
  created_lines: number;
  matched: number;
  new_products: NewProductResultDTO[];
  errors: ImportRowError[];
  units: number;
  subtotal: Numeric;
  igv: Numeric;
  total: Numeric;
}

export interface PurchaseLineDTO {
  id: string;
  company_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_ruc: string;
  product_id: string;
  product_name: string;
  sku: string;
  purchase_date: string;
  quantity: number;
  unit_cost: Numeric;
  total_amount: Numeric;
  currency: string;
  document_number: string;
  notes: string;
  import_batch_id: string | null;
  document_id: string;
  created_at: string | null;
}

export interface PurchaseDocumentDTO {
  document_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_ruc: string;
  document_number: string;
  purchase_date: string;
  notes: string;
  lines: number;
  units: number;
  total: Numeric;
  created_at: string | null;
}

export interface PurchaseDocumentDetailDTO extends Omit<PurchaseDocumentDTO, "lines"> {
  lines: PurchaseLineDTO[];
}

export interface PurchaseDocumentPageDTO {
  items: PurchaseDocumentDTO[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PurchaseFilters {
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
  page?: number;
  size?: number;
}
