/** User-defined columns (custom fields) and saved UI preferences. */

export type CustomFieldEntity = "product" | "supplier" | "purchase" | "sale";
export type CustomFieldType = "text" | "number" | "currency" | "date" | "boolean" | "select" | "url";

export interface CustomFieldDTO {
  id: string;
  company_id: string;
  entity: CustomFieldEntity;
  /** Stable slug used as the key inside each record's `custom_attributes`. */
  key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  position: number;
  is_visible: boolean;
  is_required: boolean;
  /**
   * Product columns only: the product types (category ids) this column applies to,
   * subcategories included. Empty = every product.
   */
  category_ids: string[];
}

export type CustomAttributes = Record<string, string | number | boolean | null>;

export const CUSTOM_FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  currency: "Monto (S/)",
  date: "Fecha",
  boolean: "Sí / No",
  select: "Lista de opciones",
  url: "Enlace",
};
