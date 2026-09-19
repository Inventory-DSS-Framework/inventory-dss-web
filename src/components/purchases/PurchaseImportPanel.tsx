"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileText, Hash, ScanBarcode, Sparkles, UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SmartImportWizard, type ImportTargetField } from "@/components/import/SmartImportWizard";
import { customFieldsApi } from "@/lib/apis/custom-fields";
import { purchasingApi } from "@/lib/apis/purchasing";
import { inputClass, soles } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { SupplierDTO } from "@/types/api";
import type { CustomFieldDTO } from "@/types/custom-fields";
import type { PurchaseImportResultDTO } from "@/types/purchasing";
import { PurchaseDocumentModal } from "./PurchaseDocumentModal";
import { fmtQty, todayISO } from "./format";

interface Props {
  companyId: string | null;
  suppliers: SupplierDTO[];
  productFields: CustomFieldDTO[];
  initialSupplierId?: string | null;
  onImported: () => void;
}

const BASE_TARGETS: ImportTargetField[] = [
  { key: "code", label: "Código", synonyms: ["codigo", "cod", "sku", "item", "codigo producto", "cod producto", "codigo interno", "cod item"], hint: "Código del producto (SKU)" },
  { key: "barcode", label: "Código de barras", synonyms: ["ean", "ean13", "codigo de barras", "cod barras", "upc", "barcode"] },
  { key: "name", label: "Producto", synonyms: ["producto", "descripcion", "articulo", "nombre", "detalle", "nombre producto", "descripcion producto"] },
  { key: "quantity", label: "Cantidad", required: true, type: "integer", synonyms: ["cantidad", "cant", "unidades", "qty", "und", "unid"] },
  { key: "unit_cost", label: "Costo unitario", required: true, type: "number", synonyms: ["costo", "costo unitario", "precio compra", "p unit", "valor unitario", "precio unitario", "costo unit", "pu"] },
  { key: "unit_price", label: "Precio de venta", type: "number", synonyms: ["precio venta", "pvp", "precio de venta", "precio publico", "p venta"] },
  { key: "purchase_date", label: "Fecha", type: "date", synonyms: ["fecha", "fecha emision", "fecha de emision", "fecha compra"] },
  { key: "document_number", label: "N° comprobante", synonyms: ["factura", "comprobante", "documento", "n doc", "nro doc", "numero documento", "serie numero", "n factura"] },
];

export function PurchaseImportPanel({ companyId, suppliers, productFields, initialSupplierId, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(initialSupplierId ?? "");
  const [date, setDate] = useState(todayISO());
  const [docNumber, setDocNumber] = useState("");
  const [includeIgv, setIncludeIgv] = useState(false);
  const [result, setResult] = useState<PurchaseImportResultDTO | null>(null);
  const [docId, setDocId] = useState<string | null>(null);

  const targets = useMemo<ImportTargetField[]>(
    () => [...BASE_TARGETS, ...productFields.map((f) => ({ key: `custom:${f.key}`, label: f.label, synonyms: [f.label, f.key] }))],
    [productFields],
  );
  const supplierOptions = suppliers.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.business_name, description: `RUC ${s.ruc}` }));
  const supplier = suppliers.find((s) => s.id === supplierId);

  const extra = (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <p className="font-display text-sm font-semibold text-text-primary">Datos de la compra</p>
      <div>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Proveedor <span className="text-danger">*</span></span>
        <Select value={supplierId} onChange={setSupplierId} options={supplierOptions} searchable placeholder="Elige el proveedor" invalid={!supplierId} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Fecha</span>
          <input type="date" className={inputClass(false, "px-2.5 py-2 text-xs")} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">N° comprob.</span>
          <input className={inputClass(false, "px-2.5 py-2 text-xs font-mono")} value={docNumber} onChange={(e) => setDocNumber(e.target.value.toUpperCase())} placeholder="F001-123" />
        </div>
      </div>
      <p className="text-[11px] text-text-muted">Si el archivo trae fecha o comprobante por fila, esos valores mandan.</p>
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={includeIgv} onChange={(e) => setIncludeIgv(e.target.checked)} className="accent-[rgb(var(--c-primary))]" />
        Los costos del archivo incluyen IGV
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-text-primary">Carga masiva desde Excel o CSV</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
              Sube el detalle de la factura o tu propia planilla: detectamos las columnas, reconocemos tus productos y creamos los que
              faltan. Todo ingresa al stock con su costo.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-3">
              <Step icon={Hash} title="Por código" text="Si la fila trae código (SKU), buscamos ese producto." />
              <Step icon={ScanBarcode} title="Por barras o nombre" text="Si no, por código de barras o nombre exacto." />
              <Step icon={Sparkles} title="Crea lo nuevo" text="Lo que no existe se crea con su código o un correlativo." />
            </ul>
          </div>
          <div className="flex flex-col items-stretch gap-3 rounded-3xl border-2 border-dashed border-border bg-surface-soft p-6 text-center">
            <UploadCloud className="mx-auto h-8 w-8 text-primary" />
            <p className="text-sm text-text-secondary">Columnas mínimas: <strong className="text-text-primary">cantidad</strong> y <strong className="text-text-primary">costo</strong>, más código o nombre.</p>
            <Button onClick={() => setOpen(true)} disabled={!companyId}>
              <FileSpreadsheet className="h-4 w-4" /> Subir archivo
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display font-semibold text-text-primary">Última importación</p>
                <p className="text-sm text-text-secondary">
                  {result.created_lines} líneas · {fmtQty(result.units)} unidades · {soles(result.total)} (IGV incl.) · {supplier?.business_name}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {result.matched} productos reconocidos · {result.new_products.length} creados
                  {result.errors.length > 0 && <span className="text-danger"> · {result.errors.length} filas con error</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.batch_ids.map((id, i) => (
                <Button key={id} variant="secondary" size="sm" onClick={() => setDocId(id)}>
                  <FileText className="h-3.5 w-3.5" /> {result.batch_ids.length > 1 ? `Documento ${i + 1}` : "Ver documento"}
                </Button>
              ))}
              <Link href="/purchases" className="btn btn-ghost h-8 px-3 text-[13px]">Historial</Link>
            </div>
          </div>

          {result.new_products.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Productos nuevos creados</p>
              <div className="max-h-72 overflow-auto rounded-2xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface-soft">
                    <tr>
                      <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Fila</th>
                      <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Código</th>
                      <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Producto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {result.new_products.map((p) => (
                      <tr key={p.product_id}>
                        <td className="px-4 py-2 text-xs text-text-muted tabular-nums">{p.row ?? "—"}</td>
                        <td className="px-4 py-2"><span className="rounded-md bg-accent-violet-soft px-1.5 py-0.5 font-mono text-xs text-accent-violet">{p.sku}</span></td>
                        <td className="px-4 py-2"><Link href={`/inventory/${p.product_id}`} className="text-text-primary hover:text-primary">{p.name}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mt-5 rounded-2xl border border-danger/25 bg-danger-soft/40 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-danger"><AlertTriangle className="h-4 w-4" /> Filas no importadas</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-text-secondary">
                {result.errors.map((e, i) => <li key={i}>Fila {e.row}: {e.message}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}

      <SmartImportWizard
        open={open}
        onClose={() => setOpen(false)}
        title="Carga masiva de compras"
        entityLabel="líneas de compra"
        targetFields={targets}
        allowNewColumns
        mappingExtra={extra}
        blockReason={!supplierId ? "Elige el proveedor" : null}
        uploadHint={
          <div className="space-y-1.5">
            <p>
              Cada fila es un producto comprado: <strong className="text-text-primary">cantidad</strong> y{" "}
              <strong className="text-text-primary">costo unitario</strong>, más su código, código de barras o nombre.
            </p>
            <p>
              Si tu archivo trae el código del producto, lo usamos; si no, creamos un código correlativo automático (P-000123) para cada
              producto nuevo.
            </p>
            <p className="text-text-muted">Las columnas extra (marca, talla, lote…) pueden guardarse como columnas del producto.</p>
          </div>
        }
        onImport={async (rows, newColumns) => {
          if (!companyId) throw new Error("Sin empresa activa.");
          if (!supplierId) throw new Error("Elige el proveedor");
          if (newColumns.length > 0) {
            await customFieldsApi.ensure(companyId, "product", newColumns.map((c) => ({ label: c.label, field_type: c.field_type })));
          }
          const res = await purchasingApi.import(companyId, {
            supplier_id: supplierId,
            purchase_date: date || todayISO(),
            document_number: docNumber.trim(),
            create_missing_products: true,
            costs_include_igv: includeIgv,
            rows: rows.map((r) => ({
              row: r.rowNumber,
              code: r.values.code,
              barcode: r.values.barcode,
              name: r.values.name,
              quantity: r.values.quantity,
              unit_cost: r.values.unit_cost,
              unit_price: r.values.unit_price,
              purchase_date: r.values.purchase_date,
              document_number: r.values.document_number,
              custom_attributes: r.custom,
            })),
          });
          setResult(res);
          const shown = res.new_products.slice(0, 12).map((p) => `${p.sku} · ${p.name}`);
          return {
            created: res.created_lines,
            errors: res.errors,
            notes: [
              `${fmtQty(res.units)} unidades ingresaron al stock · ${soles(res.total)} con IGV`,
              `${res.matched} productos reconocidos · ${res.new_products.length} productos nuevos`,
              ...shown,
              ...(res.new_products.length > shown.length ? [`y ${res.new_products.length - shown.length} más (ver detalle al cerrar)`] : []),
            ],
          };
        }}
        onFinished={onImported}
      />

      <PurchaseDocumentModal open={docId !== null} onClose={() => setDocId(null)} companyId={companyId} documentId={docId} />
    </div>
  );
}

function Step({ icon: Icon, title, text }: { icon: typeof Hash; title: string; text: string }) {
  return (
    <li className={cn("rounded-2xl border border-border bg-surface-soft/50 p-3")}>
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-1.5 text-sm font-semibold text-text-primary">{title}</p>
      <p className="text-xs text-text-muted">{text}</p>
    </li>
  );
}
