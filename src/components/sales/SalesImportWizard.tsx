"use client";

import { SmartImportWizard, type ImportResult, type ImportRow } from "@/components/import/SmartImportWizard";
import type { ImportTargetField } from "@/lib/import/parse";
import { soles } from "@/lib/ui";
import { salesHistoryApi } from "@/lib/apis/pos";

const TARGETS: ImportTargetField[] = [
  { key: "sale_date", label: "Fecha", required: true, type: "date", synonyms: ["fecha", "fecha de venta", "fecha venta", "fecha emisión", "fecha emision", "día", "dia", "date"] },
  { key: "code", label: "Código (SKU)", synonyms: ["código", "codigo", "cod", "cód", "código producto", "codigo producto", "sku", "item", "ref"], hint: "Así encontramos el producto" },
  { key: "barcode", label: "Código de barras", synonyms: ["ean", "ean13", "código de barras", "codigo de barras", "cod barras", "cod barra", "barcode", "upc"] },
  { key: "name", label: "Producto", synonyms: ["producto", "descripción", "descripcion", "artículo", "articulo", "detalle", "nombre"], hint: "Si no hay código, se busca por nombre exacto" },
  { key: "quantity", label: "Cantidad", required: true, type: "integer", synonyms: ["cantidad", "cant", "cant.", "unidades", "qty", "und"] },
  { key: "unit_price", label: "Precio unitario", type: "number", synonyms: ["precio unitario", "p. unit", "p unit", "p.unit", "precio", "pvp", "valor unitario", "precio venta"], hint: "Si falta, usamos el precio del producto" },
  { key: "seller_name", label: "Vendedor", synonyms: ["vendedor", "cajero", "cajera", "atendido por", "usuario", "vendedora"] },
];

export type SalesImportMode = "history" | "stock";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  onFinished: () => void;
  /**
   * "history": past sales from another system — no stock movement (Ventas › Historial).
   * "stock": bulk sales of real operations — each line takes stock out (Nueva venta).
   */
  mode?: SalesImportMode;
}

/**
 * Bulk sales from an Excel/CSV (one row per product sold). Matches each row to a product by
 * code, barcode or name; columns like comprobante, cliente or medio de pago are not imported.
 */
export function SalesImportWizard({ open, onClose, companyId, onFinished, mode = "history" }: Props) {
  const affectStock = mode === "stock";

  const onImport = async (rows: ImportRow[]): Promise<ImportResult> => {
    if (!companyId) throw new Error("Sesión no disponible");
    const res = await salesHistoryApi.import(
      companyId,
      rows.map((r) => ({
        row: r.rowNumber,
        code: r.values.code,
        barcode: r.values.barcode,
        name: r.values.name,
        sale_date: r.values.sale_date ?? "",
        quantity: r.values.quantity ?? "",
        unit_price: r.values.unit_price,
        seller_name: r.values.seller_name,
      })),
      { affectStock },
    );
    const notes: string[] = [];
    if (res.created > 0) {
      notes.push(
        `${res.units.toLocaleString("es-PE")} unidades · ${soles(res.revenue)} · ${res.products} productos` +
          (res.period_start && res.period_end ? ` · del ${fmt(res.period_start)} al ${fmt(res.period_end)}` : ""),
      );
      notes.push(
        affectStock
          ? "Se descontó el stock de cada producto al costo promedio."
          : "Son historial: no descuentan stock y ya alimentan tus reportes y el Motor FTGM.",
      );
    }
    return { created: res.created, errors: res.errors, notes };
  };

  return (
    <SmartImportWizard
      open={open}
      onClose={onClose}
      title={affectStock ? "Carga masiva de ventas" : "Importar historial de ventas"}
      entityLabel="ventas"
      targetFields={TARGETS}
      allowNewColumns={false}
      onImport={onImport}
      onFinished={onFinished}
      uploadHint={
        affectStock ? (
          <p>
            Registra de una vez las ventas de otro canal (Instagram, WhatsApp, feria, tienda online): una fila por
            producto vendido con <strong>fecha</strong>, <strong>cantidad</strong> y código, código de barras o nombre
            exacto. Cada venta <strong>descuenta stock</strong>; si una fila pide más de lo que hay, se rechaza y te
            decimos cuánto queda. Comprobante, cliente o medio de pago no se importan.
          </p>
        ) : (
          <p>
            Sube el reporte de ventas de tu sistema anterior o tu Excel (una fila por producto vendido). Necesitamos la
            <strong> fecha</strong>, la <strong>cantidad</strong> y cómo reconocer el producto: código, código de barras o
            nombre exacto. Importa primero tu inventario. Quedan como historial: <strong>no descuentan stock</strong>,
            porque tu stock actual ya las refleja.
          </p>
        )
      }
    />
  );
}

function fmt(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
