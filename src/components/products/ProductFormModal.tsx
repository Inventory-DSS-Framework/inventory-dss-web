"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, ScanBarcode, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CustomFieldInput } from "@/components/custom-fields/CustomFieldInput";
import { cn } from "@/lib/utils";
import { inputClass, soles } from "@/lib/ui";
import { productsApi } from "@/lib/api";
import { catalogApi } from "@/lib/apis/inventory";
import { customFieldsApi } from "@/lib/apis/custom-fields";
import { useApi } from "@/hooks/useApi";
import type { CategoryDTO, ProductDTO } from "@/types/api";
import type { CustomAttributes, CustomFieldDTO } from "@/types/custom-fields";
import { ProductImagePicker } from "./ProductImagePicker";
import { categoryOptions } from "./categoryTree";
import { fieldsForCategory } from "@/lib/custom-fields/scope";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  /** null = create, a product = edit. */
  product: ProductDTO | null;
  categories: CategoryDTO[];
  onSaved: (product?: ProductDTO) => void;
  onDeleted?: () => void;
  /** Company custom fields for products; loaded on demand when omitted. */
  fields?: CustomFieldDTO[];
}

const UOM_OPTIONS = [
  { value: "unit", label: "Unidad" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "g", label: "Gramo (g)" },
  { value: "l", label: "Litro (l)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "caja", label: "Caja" },
  { value: "paquete", label: "Paquete" },
  { value: "bolsa", label: "Bolsa" },
  { value: "par", label: "Par" },
  { value: "docena", label: "Docena" },
];

const CURRENCY_OPTIONS = [
  { value: "PEN", label: "Soles (S/)" },
  { value: "USD", label: "Dólares (US$)" },
];

type FormState = {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category_id: string;
  unit_cost: string;
  unit_price: string;
  currency: string;
  unit_of_measure: string;
  lead_time_days: string;
  safety_stock: string;
  reorder_point: string;
  initial_stock: string;
  image_url: string | null;
  custom: CustomAttributes;
};

const EMPTY: FormState = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  category_id: "",
  unit_cost: "",
  unit_price: "",
  currency: "PEN",
  unit_of_measure: "unit",
  lead_time_days: "0",
  safety_stock: "0",
  reorder_point: "0",
  initial_stock: "",
  image_url: null,
  custom: {},
};

function fromProduct(p: ProductDTO): FormState {
  return {
    sku: p.sku,
    barcode: p.barcode ?? "",
    name: p.name,
    description: p.description ?? "",
    category_id: p.category_id ?? "",
    unit_cost: String(Number(p.unit_cost)),
    unit_price: String(Number(p.unit_price)),
    currency: p.currency,
    unit_of_measure: p.unit_of_measure,
    lead_time_days: String(p.lead_time_days),
    safety_stock: String(p.safety_stock),
    reorder_point: String(p.reorder_point),
    initial_stock: "",
    image_url: p.image_url ?? null,
    custom: { ...(p.custom_attributes ?? {}) },
  };
}

type Errors = Partial<Record<keyof FormState | `custom:${string}`, string>>;

function validate(f: FormState, isEdit: boolean, fields: CustomFieldDTO[]): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "Escribe el nombre del producto";
  const cost = Number(f.unit_cost || 0);
  if (Number.isNaN(cost) || cost < 0) e.unit_cost = "Costo inválido";
  const price = Number(f.unit_price);
  if (f.unit_price === "" || Number.isNaN(price) || price < 0) e.unit_price = "Indica el precio de venta";
  (["lead_time_days", "safety_stock", "reorder_point"] as const).forEach((k) => {
    const n = Number(f[k] || 0);
    if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) e[k] = "Entero ≥ 0";
  });
  if (!isEdit && f.initial_stock !== "") {
    const n = Number(f.initial_stock);
    if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) e.initial_stock = "Entero ≥ 0";
  }
  for (const field of fields) {
    const v = f.custom[field.key];
    if (field.is_required && (v == null || v === "")) e[`custom:${field.key}`] = "Obligatorio";
  }
  return e;
}

export function ProductFormModal({
  open,
  onClose,
  companyId,
  product,
  categories,
  onSaved,
  onDeleted,
  fields: fieldsProp,
}: ProductFormModalProps) {
  const isEdit = product !== null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loaded = useApi(
    () => (companyId && open && !fieldsProp ? customFieldsApi.list(companyId, "product") : Promise.resolve([] as CustomFieldDTO[])),
    [companyId, open, !!fieldsProp],
  );
  const allFields = fieldsProp ?? loaded.data ?? [];
  // Columns follow the product type: "Talla" only shows for Ropa, "Voltaje" for Electro.
  const fields = useMemo(() => fieldsForCategory(allFields, form.category_id, categories), [allFields, form.category_id, categories]);
  const otherTypeFields = allFields.length - fields.length;
  const categoryName = categories.find((c) => c.id === form.category_id)?.name;

  useEffect(() => {
    if (!open) return;
    setForm(product ? fromProduct(product) : EMPTY);
    setErrors({});
    setApiError(null);
    setConfirmDelete(false);
  }, [open, product]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const catOptions = useMemo(() => categoryOptions(categories, "Sin categoría"), [categories]);
  const uomOptions = useMemo(
    () =>
      UOM_OPTIONS.some((o) => o.value === form.unit_of_measure)
        ? UOM_OPTIONS
        : [...UOM_OPTIONS, { value: form.unit_of_measure, label: form.unit_of_measure }],
    [form.unit_of_measure],
  );

  const price = Number(form.unit_price);
  const cost = Number(form.unit_cost || 0);
  const margin = price > 0 && !Number.isNaN(cost) ? ((price - cost) / price) * 100 : null;

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    const errs = validate(form, isEdit, fields);
    setErrors(errs);
    if (Object.keys(errs).length > 0 || !companyId) return;

    setSaving(true);
    setApiError(null);
    const custom = Object.fromEntries(Object.entries(form.custom).filter(([, v]) => v !== "" && v != null));
    const common = {
      name: form.name.trim(),
      description: form.description.trim(),
      category_id: form.category_id || null,
      unit_cost: Number(form.unit_cost || 0),
      unit_price: Number(form.unit_price),
      unit_of_measure: form.unit_of_measure || "unit",
      lead_time_days: Number(form.lead_time_days || 0),
      safety_stock: Number(form.safety_stock || 0),
      reorder_point: Number(form.reorder_point || 0),
      barcode: form.barcode.trim() || null,
      image_url: form.image_url,
      custom_attributes: custom,
    };
    try {
      const saved = isEdit
        ? await catalogApi.update(companyId, product.id, {
            ...common,
            ...(form.sku.trim() && form.sku.trim().toUpperCase() !== product.sku ? { sku: form.sku.trim() } : {}),
          })
        : await catalogApi.create(companyId, {
            ...common,
            sku: form.sku.trim() || null,
            currency: form.currency,
            initial_stock: form.initial_stock ? Number(form.initial_stock) : 0,
          });
      onSaved(saved);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId || !product) return;
    setDeleting(true);
    setApiError(null);
    try {
      await productsApi.remove(companyId, product.id);
      onSaved();
      onDeleted?.();
      onClose();
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el producto. Si ya tiene ventas, desactívalo en lugar de eliminarlo.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Editar producto" : "Nuevo producto"}
      description={isEdit ? `${product?.name} · ${product?.sku}` : "Registra un producto con su foto, precios y stock inicial."}
      footer={
        <>
          {isEdit &&
            (confirmDelete ? (
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs text-text-secondary">¿Eliminar este producto?</span>
                <button onClick={handleDelete} disabled={busy} className="text-xs font-semibold text-danger hover:underline">
                  Sí, eliminar
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-text-muted hover:text-text-primary">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                className="inline-flex flex-1 items-center gap-1.5 text-sm font-medium text-danger transition-opacity hover:opacity-80"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            ))}
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => handleSubmit()} loading={saving} disabled={busy}>
            {isEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {apiError && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{apiError}</div>
        )}

        <div className="grid gap-5 sm:grid-cols-[168px_1fr]">
          <div>
            <ProductImagePicker value={form.image_url} onChange={(v) => set("image_url", v)} disabled={busy} />
          </div>
          <div className="space-y-4">
            <Field label="Nombre del producto" required error={errors.name}>
              <input
                className={inputClass(errors.name)}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ej. Alimento Premium Perro Adulto 15 kg"
                autoFocus={!isEdit}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Código (SKU)"
                hint={isEdit ? undefined : "Si lo dejas vacío se genera P-000123"}
                error={errors.sku}
              >
                <input
                  className={inputClass(errors.sku, "font-mono uppercase placeholder:normal-case placeholder:font-sans")}
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  placeholder={isEdit ? "" : "Automático"}
                />
              </Field>
              <Field label="Código de barras" error={errors.barcode}>
                <div className="relative">
                  <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    className={inputClass(errors.barcode, "pl-9 font-mono")}
                    value={form.barcode}
                    onChange={(e) => set("barcode", e.target.value)}
                    // Barcode scanners type the code and press Enter: don't submit the form.
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    placeholder="Escanea o escribe (EAN-13)"
                    inputMode="numeric"
                  />
                </div>
              </Field>
            </div>
            <Field label="Categoría" hint="Marca › Tipo">
              <Select
                value={form.category_id}
                options={catOptions}
                onChange={(v) => set("category_id", v)}
                searchable
                placeholder="Sin categoría"
                emptyText="No hay categorías con ese nombre"
              />
            </Field>
          </div>
        </div>

        <Section title="Precio y costo">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Precio de venta" required error={errors.unit_price}>
              <MoneyInput value={form.unit_price} onChange={(v) => set("unit_price", v)} error={errors.unit_price} currency={form.currency} />
            </Field>
            <Field
              label={isEdit ? "Costo promedio" : "Costo unitario"}
              error={errors.unit_cost}
              hint={isEdit && product?.last_cost != null ? `Último costo: ${soles(product.last_cost)}` : undefined}
            >
              <MoneyInput value={form.unit_cost} onChange={(v) => set("unit_cost", v)} error={errors.unit_cost} currency={form.currency} />
            </Field>
            {isEdit ? (
              <MarginTile margin={margin} />
            ) : (
              <Field label="Moneda">
                <Select value={form.currency} options={CURRENCY_OPTIONS} onChange={(v) => set("currency", v)} />
              </Field>
            )}
          </div>
          {!isEdit && margin !== null && (
            <p className="mt-2 text-xs text-text-secondary">
              Margen bruto estimado: <strong className={margin < 0 ? "text-danger" : "text-success"}>{margin.toFixed(1)}%</strong>
            </p>
          )}
          {isEdit && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-text-muted">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" />
              El costo promedio se recalcula solo con cada compra. Edítalo aquí únicamente para corregirlo.
            </p>
          )}
        </Section>

        <Section title="Stock">
          <div className="grid gap-4 sm:grid-cols-4">
            {!isEdit && (
              <Field label="Stock inicial" error={errors.initial_stock} hint="Se registra al costo unitario">
                <input type="number" min="0" step="1" className={inputClass(errors.initial_stock)} value={form.initial_stock} onChange={(e) => set("initial_stock", e.target.value)} placeholder="0" />
              </Field>
            )}
            <Field label="Stock de seguridad" error={errors.safety_stock}>
              <input type="number" min="0" step="1" className={inputClass(errors.safety_stock)} value={form.safety_stock} onChange={(e) => set("safety_stock", e.target.value)} />
            </Field>
            <Field label="Punto de reorden" error={errors.reorder_point}>
              <input type="number" min="0" step="1" className={inputClass(errors.reorder_point)} value={form.reorder_point} onChange={(e) => set("reorder_point", e.target.value)} />
            </Field>
            <Field label="Reposición (días)" error={errors.lead_time_days}>
              <input type="number" min="0" step="1" className={inputClass(errors.lead_time_days)} value={form.lead_time_days} onChange={(e) => set("lead_time_days", e.target.value)} />
            </Field>
            <Field label="Unidad de medida">
              <Select value={form.unit_of_measure} options={uomOptions} onChange={(v) => set("unit_of_measure", v)} />
            </Field>
          </div>
        </Section>

        {(fields.length > 0 || otherTypeFields > 0) && (
          <Section title="Tus columnas">
            <p className="-mt-1 mb-3 flex items-start gap-1.5 text-xs text-text-muted">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" />
              {categoryName
                ? `Columnas para productos de tipo «${categoryName}».`
                : "Columnas para todos los productos. Elige una categoría para ver las de ese tipo."}
              {otherTypeFields > 0 && ` Hay ${otherTypeFields} más para otros tipos.`}
            </p>
            {fields.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-text-secondary">Este tipo de producto no tiene columnas propias.</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <Field key={field.id} label={field.label} required={field.is_required} error={errors[`custom:${field.key}`]}>
                  <CustomFieldInput
                    field={field}
                    value={form.custom[field.key]}
                    onChange={(v) => setForm((f) => ({ ...f, custom: { ...f.custom, [field.key]: v } }))}
                  />
                </Field>
              ))}
            </div>
          </Section>
        )}

        <Section title="Descripción">
          <textarea
            className={cn(inputClass(), "resize-none")}
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Presentación, sabor, talla, indicaciones… (opcional)"
          />
        </Section>
      </form>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
        {title}
        <span className="h-px flex-1 bg-border-soft" />
      </h3>
      {children}
    </section>
  );
}

function MoneyInput({ value, onChange, error, currency }: { value: string; onChange: (v: string) => void; error?: string; currency: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted">
        {currency === "USD" ? "US$" : "S/"}
      </span>
      <input
        type="number"
        step="0.01"
        min="0"
        className={inputClass(error, currency === "USD" ? "pl-12 tabular-nums" : "pl-9 tabular-nums")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
      />
    </div>
  );
}

function MarginTile({ margin }: { margin: number | null }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-primary">Margen bruto</span>
      <div
        className={cn(
          "flex h-[42px] items-center rounded-xl border px-3.5 font-display text-base font-semibold tabular-nums",
          margin === null
            ? "border-border bg-surface-soft text-text-muted"
            : margin < 0
              ? "border-danger/25 bg-danger-soft text-danger"
              : "border-success/25 bg-success-soft text-success",
        )}
      >
        {margin === null ? "—" : `${margin.toFixed(1)}%`}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
}
