"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
import { SmartImportWizard, type ImportResult, type ImportRow, type NewCustomColumn } from "@/components/import/SmartImportWizard";
import type { ImportTargetField } from "@/lib/import/parse";
import { cn } from "@/lib/utils";
import { customFieldsApi } from "@/lib/apis/custom-fields";
import { catalogApi } from "@/lib/apis/inventory";
import type { CustomFieldDTO } from "@/types/custom-fields";
import type { ProductImportRow } from "@/types/inventory";

const BUILTIN_TARGETS: ImportTargetField[] = [
  { key: "sku", label: "Código (SKU)", synonyms: ["código", "codigo", "cod", "cód", "codigo producto", "código producto", "cod producto", "item", "sku", "ref", "referencia"], hint: "Si falta, se genera P-000123" },
  { key: "barcode", label: "Código de barras", synonyms: ["ean", "ean13", "código de barras", "codigo de barras", "cod barra", "cod barras", "codbarra", "barcode", "upc", "gtin"] },
  { key: "name", label: "Nombre", required: true, synonyms: ["producto", "nombre", "descripción", "descripcion", "artículo", "articulo", "nombre producto", "detalle"] },
  { key: "category", label: "Categoría", synonyms: ["categoría", "categoria", "familia", "línea", "linea", "rubro", "marca", "grupo"], hint: "Usa “Marca > Tipo” para dos niveles" },
  { key: "unit_cost", label: "Costo unitario", type: "number", synonyms: ["costo", "costo unitario", "p. compra", "p compra", "precio compra", "precio de compra", "cost", "costo promedio"] },
  { key: "unit_price", label: "Precio de venta", required: true, type: "number", synonyms: ["precio", "pvp", "precio venta", "precio de venta", "p. venta", "p venta", "price"] },
  { key: "initial_stock", label: "Stock", type: "integer", synonyms: ["stock", "cantidad", "existencia", "existencias", "saldo", "unidades", "stock actual", "cant"] },
  { key: "safety_stock", label: "Stock de seguridad", type: "integer", synonyms: ["stock de seguridad", "stock seguridad", "stock minimo", "stock mínimo", "minimo", "mínimo"] },
  { key: "reorder_point", label: "Punto de reorden", type: "integer", synonyms: ["punto de reorden", "punto reorden", "reorden", "punto de pedido"] },
  { key: "lead_time_days", label: "Días de reposición", type: "integer", synonyms: ["lead time", "tiempo de reposición", "tiempo reposicion", "dias reposicion", "días de entrega"] },
  { key: "unit_of_measure", label: "Unidad de medida", synonyms: ["unidad", "um", "u.m.", "unidad de medida", "medida"] },
];

const TEMPLATE =
  "Código,Código de barras,Producto,Categoría,Costo,Precio venta,Stock,Stock de seguridad,Punto de reorden,Unidad\n" +
  "PH-001,7750000000011,Alimento Premium Perro Adulto 15kg,Pro Plan > Alimento seco,185.50,239.90,12,3,6,unit\n" +
  ",7750000000028,Arena Sanitaria Gato 10kg,Cat Chow > Higiene,32.00,45.90,20,5,8,bolsa\n";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  fields: CustomFieldDTO[];
  onFinished: () => void;
}

export function ProductImportWizard({ open, onClose, companyId, fields, onFinished }: Props) {
  const [updateExisting, setUpdateExisting] = useState(true);

  const targetFields = useMemo<ImportTargetField[]>(
    () => [
      ...BUILTIN_TARGETS,
      ...fields.map((f) => ({
        key: `custom:${f.key}`,
        label: f.label,
        synonyms: [f.label, f.key],
        type: f.field_type === "number" || f.field_type === "currency" ? ("number" as const) : f.field_type === "date" ? ("date" as const) : ("text" as const),
      })),
    ],
    [fields],
  );

  const onImport = async (rows: ImportRow[], newColumns: NewCustomColumn[]): Promise<ImportResult> => {
    if (!companyId) throw new Error("Sesión no disponible");
    const keyMap = new Map<string, string>();
    if (newColumns.length > 0) {
      const ensured = await customFieldsApi.ensure(
        companyId,
        "product",
        newColumns.map((c) => ({ label: c.label, field_type: c.field_type })),
      );
      for (const col of newColumns) {
        const match = ensured.find((f) => f.key === col.key) ?? ensured.find((f) => f.label.toLowerCase() === col.label.toLowerCase());
        keyMap.set(col.key, match?.key ?? col.key);
      }
    }
    const payload: ProductImportRow[] = rows.map((r) => {
      const v = r.values;
      const custom: Record<string, string> = {};
      for (const [k, value] of Object.entries(r.custom)) custom[keyMap.get(k) ?? k] = value;
      return {
        row: r.rowNumber,
        sku: v.sku,
        barcode: v.barcode,
        name: v.name ?? "",
        category: v.category,
        unit_cost: v.unit_cost,
        unit_price: v.unit_price,
        initial_stock: v.initial_stock,
        safety_stock: v.safety_stock,
        reorder_point: v.reorder_point,
        lead_time_days: v.lead_time_days,
        unit_of_measure: v.unit_of_measure,
        custom_attributes: custom,
      };
    });
    const res = await catalogApi.import(companyId, payload, updateExisting);
    const notes: string[] = [];
    if (res.categories_created > 0) notes.push(`Se crearon ${res.categories_created} categorías nuevas.`);
    if (newColumns.length > 0) notes.push(`Se agregaron ${newColumns.length} columnas a tu inventario.`);
    return { created: res.created, updated: res.updated, errors: res.errors, notes };
  };

  const downloadTemplate = () => {
    const blob = new Blob(["﻿" + TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-inventario.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SmartImportWizard
      open={open}
      onClose={onClose}
      title="Importar inventario"
      entityLabel="productos"
      targetFields={targetFields}
      allowNewColumns
      onImport={onImport}
      onFinished={onFinished}
      uploadHint={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Sube tu Excel tal como lo tienes: nombre y precio son obligatorios. Si una fila no trae código, le asignamos el
            siguiente correlativo (P-000123). Las columnas que no reconozcamos pueden convertirse en columnas nuevas.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs font-semibold text-text-primary hover:border-primary/30"
          >
            <Download className="h-3.5 w-3.5 text-primary" /> Plantilla CSV
          </button>
        </div>
      }
      mappingExtra={
        <button
          type="button"
          onClick={() => setUpdateExisting((v) => !v)}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
            updateExisting ? "border-primary/25 bg-primary-softer/60" : "border-border bg-surface",
          )}
          aria-pressed={updateExisting}
        >
          <span
            className={cn(
              "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
              updateExisting ? "bg-primary" : "bg-surface-muted",
            )}
          >
            <span className={cn("h-4 w-4 rounded-full bg-surface shadow-soft transition-transform", updateExisting && "translate-x-4")} />
          </span>
          <span>
            <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-text-primary">
              <RefreshCcw className="h-3.5 w-3.5 text-primary" /> Actualizar existentes
            </span>
            <span className="mt-1 block text-xs text-text-secondary">
              {updateExisting
                ? "Si el código o el código de barras ya existe, actualizamos precio, datos y ajustamos el stock al del archivo."
                : "Las filas con un código que ya existe se reportarán como error y no se tocarán."}
            </span>
          </span>
        </button>
      }
    />
  );
}
