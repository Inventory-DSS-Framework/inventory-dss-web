"use client";

import { useEffect, useState } from "react";
import { PackageMinus } from "lucide-react";
import { SmartImportWizard, type ImportResult, type ImportRow } from "@/components/import/SmartImportWizard";
import type { ImportTargetField } from "@/lib/import/parse";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { salesHistoryApi } from "@/lib/apis/pos";

const TARGETS: ImportTargetField[] = [
  { key: "sale_date", label: "Fecha", required: true, type: "date", synonyms: ["fecha", "fecha de venta", "fecha venta", "fecha emisión", "fecha emision", "día", "dia", "date"] },
  { key: "code", label: "Código", synonyms: ["código", "codigo", "cod", "cód", "código producto", "codigo producto", "sku", "item", "ref"], hint: "Así encontramos el producto" },
  { key: "barcode", label: "Código de barras", synonyms: ["ean", "ean13", "código de barras", "codigo de barras", "cod barras", "cod barra", "barcode", "upc"] },
  { key: "name", label: "Producto", synonyms: ["producto", "descripción", "descripcion", "artículo", "articulo", "detalle", "nombre"], hint: "Si no hay código, se busca por nombre exacto" },
  { key: "quantity", label: "Cantidad", required: true, type: "integer", synonyms: ["cantidad", "cant", "cant.", "unidades", "qty", "und"] },
  { key: "unit_price", label: "Precio unitario", type: "number", synonyms: ["precio unitario", "p. unit", "p unit", "p.unit", "precio", "pvp", "valor unitario", "precio venta"], hint: "Si falta, usamos el precio del producto" },
  { key: "document_number", label: "Comprobante", synonyms: ["comprobante", "n° comprobante", "nro comprobante", "boleta", "factura", "ticket", "pedido", "n° pedido", "documento", "serie"], hint: "Las filas con el mismo comprobante forman un ticket" },
  { key: "payment_method", label: "Medio de pago", synonyms: ["medio de pago", "forma de pago", "método de pago", "metodo de pago", "pago"] },
  { key: "client_name", label: "Cliente", synonyms: ["cliente", "razón social", "razon social", "nombre cliente"] },
  { key: "client_doc", label: "DNI / RUC del cliente", synonyms: ["dni/ruc", "dni ruc", "dni", "ruc", "doc cliente", "documento cliente", "doc. cliente"] },
  { key: "seller_name", label: "Vendedor", synonyms: ["vendedor", "cajero", "cajera", "atendido por", "usuario", "vendedora"] },
];

export type SalesImportMode = "history" | "stock";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  onFinished: () => void;
  /**
   * Default for "Descontar del stock": "history" (past sales already reflected in the
   * stock) starts off; "stock" (today's sales from another channel) starts on.
   */
  mode?: SalesImportMode;
}

/**
 * Bulk sales from an Excel/CSV (one row per product sold). Rows sharing a comprobante become
 * one ticket with its client, payment method and seller, so they show up in Ventas › Tickets.
 * A visible switch decides whether the stock is discounted.
 */
export function SalesImportWizard({ open, onClose, companyId, onFinished, mode = "history" }: Props) {
  const [affectStock, setAffectStock] = useState(mode === "stock");
  useEffect(() => {
    if (open) setAffectStock(mode === "stock");
  }, [open, mode]);

  const onImport = async (rows: ImportRow[]): Promise<ImportResult> => {
    if (!companyId) throw new Error("Sesión no disponible");
    const v = (r: ImportRow, k: string) => r.values[k] || undefined;
    const res = await salesHistoryApi.import(
      companyId,
      rows.map((r) => ({
        row: r.rowNumber,
        code: v(r, "code"),
        barcode: v(r, "barcode"),
        name: v(r, "name"),
        sale_date: r.values.sale_date ?? "",
        quantity: r.values.quantity ?? "",
        unit_price: v(r, "unit_price"),
        seller_name: v(r, "seller_name"),
        document_number: v(r, "document_number"),
        payment_method: v(r, "payment_method"),
        client_name: v(r, "client_name"),
        client_doc: v(r, "client_doc"),
      })),
      { affectStock },
    );
    const notes: string[] = [];
    if (res.created > 0) {
      notes.push(
        `${res.tickets.toLocaleString("es-PE")} ventas · ${res.units.toLocaleString("es-PE")} unidades · ${soles(res.revenue)}` +
          (res.period_start && res.period_end ? ` · del ${fmt(res.period_start)} al ${fmt(res.period_end)}` : ""),
      );
      notes.push("Ya aparecen en tus Ventas y en tu Inicio.");
      notes.push(affectStock ? "Se descontó el stock de cada producto." : "Tu stock no se modificó.");
      notes.push("Siguiente paso: entra a «Planifica tus compras» y toca «Calcular cuánto venderé».");
    }
    return { created: res.created, errors: res.errors, notes };
  };

  return (
    <SmartImportWizard
      open={open}
      onClose={onClose}
      title={mode === "stock" ? "Cargar muchas ventas a la vez" : "Importar ventas pasadas"}
      entityLabel="ventas"
      targetFields={TARGETS}
      allowNewColumns={false}
      onImport={onImport}
      onFinished={onFinished}
      uploadHint={
        <p>
          Sube tu Excel de ventas: una fila por cada producto vendido, con la <strong>fecha</strong>, la
          <strong> cantidad</strong> y el nombre o código del producto. Si tiene el número de <strong>boleta o factura</strong>,
          juntamos esas filas en una sola venta. Antes, asegúrate de haber cargado tus productos.
        </p>
      }
      mappingExtra={
        <button
          type="button"
          onClick={() => setAffectStock((x) => !x)}
          aria-pressed={affectStock}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
            affectStock ? "border-warning/40 bg-warning-soft/50" : "border-border bg-surface",
          )}
        >
          <span className={cn("mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors", affectStock ? "bg-warning" : "bg-surface-muted")}>
            <span className={cn("h-4 w-4 rounded-full bg-surface shadow-soft transition-transform", affectStock && "translate-x-4")} />
          </span>
          <span>
            <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-text-primary">
              <PackageMinus className="h-3.5 w-3.5 text-warning" /> Descontar del stock
            </span>
            <span className="mt-1 block text-xs text-text-secondary">
              {affectStock
                ? "Cada venta resta unidades de tu stock. Úsalo para ventas nuevas hechas fuera de la tienda; si no hay stock, esa fila no se carga."
                : "Tu stock no cambia. Es lo correcto para ventas pasadas: tu stock actual ya las refleja."}
            </span>
          </span>
        </button>
      }
    />
  );
}

function fmt(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
