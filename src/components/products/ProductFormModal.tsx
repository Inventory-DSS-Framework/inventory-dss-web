"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { productsApi } from "@/lib/api";
import type { CategoryDTO, ProductDTO } from "@/types/api";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  /** null = create, a product = edit. */
  product: ProductDTO | null;
  categories: CategoryDTO[];
  onSaved: () => void;
}

type FormState = {
  sku: string;
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
};

const EMPTY: FormState = {
  sku: "",
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
};

function fromProduct(p: ProductDTO): FormState {
  return {
    sku: p.sku,
    name: p.name,
    description: p.description ?? "",
    category_id: p.category_id ?? "",
    unit_cost: String(p.unit_cost),
    unit_price: String(p.unit_price),
    currency: p.currency,
    unit_of_measure: p.unit_of_measure,
    lead_time_days: String(p.lead_time_days),
    safety_stock: String(p.safety_stock),
    reorder_point: String(p.reorder_point),
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState, isEdit: boolean): Errors {
  const e: Errors = {};
  if (!isEdit && !f.sku.trim()) e.sku = "El SKU es obligatorio";
  if (!f.name.trim()) e.name = "El nombre es obligatorio";
  const cost = Number(f.unit_cost);
  if (f.unit_cost === "" || Number.isNaN(cost) || cost < 0) e.unit_cost = "Costo inválido";
  const price = Number(f.unit_price);
  if (f.unit_price === "" || Number.isNaN(price) || price < 0) e.unit_price = "Precio inválido";
  (["lead_time_days", "safety_stock", "reorder_point"] as const).forEach((k) => {
    const n = Number(f[k]);
    if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) e[k] = "Entero ≥ 0";
  });
  return e;
}

export function ProductFormModal({ open, onClose, companyId, product, categories, onSaved }: ProductFormModalProps) {
  const isEdit = product !== null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(product ? fromProduct(product) : EMPTY);
    setErrors({});
    setApiError(null);
    setConfirmDelete(false);
  }, [open, product]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validate(form, isEdit);
    setErrors(errs);
    if (Object.keys(errs).length > 0 || !companyId) return;

    setSaving(true);
    setApiError(null);
    const common = {
      name: form.name.trim(),
      description: form.description.trim(),
      category_id: form.category_id || null,
      unit_cost: Number(form.unit_cost),
      unit_price: Number(form.unit_price),
      unit_of_measure: form.unit_of_measure.trim() || "unit",
      lead_time_days: Number(form.lead_time_days),
      safety_stock: Number(form.safety_stock),
      reorder_point: Number(form.reorder_point),
    };
    try {
      if (isEdit) {
        await productsApi.update(companyId, product.id, common);
      } else {
        await productsApi.create(companyId, { ...common, sku: form.sku.trim(), currency: form.currency });
      }
      onSaved();
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
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "No se pudo eliminar el producto");
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar producto" : "Nuevo producto"}
      description={isEdit ? product?.sku : "Registra un producto en el catálogo."}
      footer={
        <>
          {isEdit &&
            (confirmDelete ? (
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-text-secondary">¿Eliminar?</span>
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
                className="flex-1 inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:opacity-80 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            ))}
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="SKU" required error={errors.sku}>
            <input
              className={inputClass(errors.sku)}
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              disabled={isEdit}
              placeholder="SKU-A100"
            />
          </Field>
          <Field label="Nombre" required error={errors.name}>
            <input
              className={inputClass(errors.name)}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Alimento premium 15kg"
            />
          </Field>

          <Field label="Categoría">
            <select className={inputClass()} value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unidad de medida">
            <input className={inputClass()} value={form.unit_of_measure} onChange={(e) => set("unit_of_measure", e.target.value)} placeholder="unit" />
          </Field>

          <Field label="Costo unitario" required error={errors.unit_cost}>
            <input type="number" step="0.01" min="0" className={inputClass(errors.unit_cost)} value={form.unit_cost} onChange={(e) => set("unit_cost", e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Precio unitario" required error={errors.unit_price}>
            <input type="number" step="0.01" min="0" className={inputClass(errors.unit_price)} value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} placeholder="0.00" />
          </Field>

          {!isEdit && (
            <Field label="Moneda">
              <select className={inputClass()} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>
          )}
          <Field label="Lead time (días)" error={errors.lead_time_days}>
            <input type="number" min="0" step="1" className={inputClass(errors.lead_time_days)} value={form.lead_time_days} onChange={(e) => set("lead_time_days", e.target.value)} />
          </Field>

          <Field label="Stock de seguridad" error={errors.safety_stock}>
            <input type="number" min="0" step="1" className={inputClass(errors.safety_stock)} value={form.safety_stock} onChange={(e) => set("safety_stock", e.target.value)} />
          </Field>
          <Field label="Punto de reorden" error={errors.reorder_point}>
            <input type="number" min="0" step="1" className={inputClass(errors.reorder_point)} value={form.reorder_point} onChange={(e) => set("reorder_point", e.target.value)} />
          </Field>
        </div>

        <Field label="Descripción">
          <textarea
            className={cn(inputClass(), "resize-none")}
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Detalle opcional del producto."
          />
        </Field>
      </form>
    </Modal>
  );
}

function inputClass(error?: string): string {
  return cn(
    "w-full bg-surface-soft border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-all focus:outline-none focus:bg-surface focus:ring-4",
    error
      ? "border-danger/50 focus:border-danger focus:ring-danger/10"
      : "border-border focus:border-primary/40 focus:ring-primary/10",
    "disabled:opacity-60 disabled:cursor-not-allowed",
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  );
}
