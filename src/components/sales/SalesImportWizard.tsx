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

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  onFinished: () => void;
}

/**
 * "Importar ventas": brings a business's past sales (Excel/CSV export of its old system)
 * in as history. Matches each row to a product by code, barcode or name; columns like
 * comprobante, cliente or medio de pago are simply not imported.
 */
export function SalesImportWizard({ open, onClose, companyId, onFinished }: Props) {
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
    );
    const notes: string[] = [];
    if (res.created > 0) {
      notes.push(
        `${res.units.toLocaleString("es-PE")} unidades · ${soles(res.revenue)} · ${res.products} productos` +
          (res.period_start && res.period_end ? ` · del ${fmt(res.period_start)} al ${fmt(res.period_end)}` : ""),
      );
      notes.push("Son historial: no descuentan stock y ya alimentan tus reportes y el Motor FTGM.");
    }
    return { created: res.created, errors: res.errors, notes };
  };

  return (
    <SmartImportWizard
      open={open}
      onClose={onClose}
      title="Importar ventas"
      entityLabel="ventas"
      targetFields={TARGETS}
      allowNewColumns={false}
      onImport={onImport}
      onFinished={onFinished}
      uploadHint={
        <p>
          Sube el reporte de ventas de tu sistema anterior o tu Excel (una fila por producto vendido). Necesitamos la
          <strong> fecha</strong>, la <strong>cantidad</strong> y cómo reconocer el producto: código, código de barras o
          nombre exacto. Importa primero tu inventario. Columnas como comprobante, cliente o medio de pago no se
          importan. Las ventas quedan como historial: <strong>no descuentan stock</strong>.
        </p>
      }
    />
  );
}

function fmt(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
