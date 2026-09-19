"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Columns3, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CustomFieldInput } from "@/components/custom-fields/CustomFieldInput";
import { inputClass } from "@/lib/ui";
import { suppliersApi } from "@/lib/api";
import { customFieldsApi } from "@/lib/apis/custom-fields";
import type { SupplierDTO } from "@/types/api";
import type { CustomAttributes, CustomFieldDTO } from "@/types/custom-fields";
import { rucError, rucKind } from "./ruc";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  /** null = create. */
  supplier: SupplierDTO | null;
  /** Receives the saved supplier (null after a delete). */
  onSaved: (saved: SupplierDTO | null) => void;
  /** The company's custom supplier columns; loaded on demand when omitted. */
  fields?: CustomFieldDTO[];
  /** Hide the delete action (e.g. quick-create from the purchase form). */
  allowDelete?: boolean;
}

type FormState = {
  ruc: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
};

const EMPTY: FormState = { ruc: "", business_name: "", contact_name: "", phone: "", email: "", address: "" };

function fromSupplier(s: SupplierDTO): FormState {
  return { ruc: s.ruc, business_name: s.business_name, contact_name: s.contact_name, phone: s.phone, email: s.email, address: s.address };
}

export function SupplierFormModal({ open, onClose, companyId, supplier, onSaved, fields, allowDelete = true }: Props) {
  const isEdit = supplier !== null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [custom, setCustom] = useState<CustomAttributes>({});
  const [loadedFields, setLoadedFields] = useState<CustomFieldDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [touchedRuc, setTouchedRuc] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(supplier ? fromSupplier(supplier) : EMPTY);
    setCustom(supplier?.custom_attributes ?? {});
    setError(null);
    setConfirmDelete(false);
    setTouchedRuc(false);
  }, [open, supplier]);

  useEffect(() => {
    if (!open || fields || !companyId) return;
    customFieldsApi.list(companyId, "supplier").then(setLoadedFields).catch(() => setLoadedFields([]));
  }, [open, fields, companyId]);

  const customFields = fields ?? loadedFields;
  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const rucMessage = isEdit ? null : rucError(form.ruc);
  const showRucError = !isEdit && !!rucMessage && (touchedRuc || form.ruc.length === 11);
  const missingRequired = customFields.filter(
    (f) => f.is_required && (custom[f.key] === undefined || custom[f.key] === null || custom[f.key] === ""),
  );
  const canSave = !!companyId && !!form.business_name.trim() && !rucMessage && missingRequired.length === 0;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSave || !companyId) {
      setTouchedRuc(true);
      return;
    }
    setSaving(true);
    setError(null);
    const common = {
      business_name: form.business_name.trim(),
      contact_name: form.contact_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      custom_attributes: custom,
    };
    try {
      const saved =
        isEdit && supplier
          ? await suppliersApi.update(companyId, supplier.id, common)
          : await suppliersApi.create(companyId, { ruc: form.ruc, ...common });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el proveedor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId || !supplier) return;
    setDeleting(true);
    setError(null);
    try {
      await suppliersApi.remove(companyId, supplier.id);
      onSaved(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el proveedor.");
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
      title={isEdit ? "Editar proveedor" : "Nuevo proveedor"}
      description={isEdit ? `RUC ${supplier?.ruc}` : "Registra un proveedor con su RUC. Validamos el dígito verificador de SUNAT."}
      footer={
        <>
          {isEdit &&
            allowDelete &&
            (confirmDelete ? (
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs text-text-secondary">¿Eliminar este proveedor?</span>
                <button onClick={handleDelete} disabled={busy} className="text-xs font-semibold text-danger hover:underline">Sí, eliminar</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-text-muted hover:text-text-primary">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} disabled={busy} className="inline-flex flex-1 items-center gap-1.5 text-sm font-medium text-danger transition-opacity hover:opacity-80">
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            ))}
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={() => handleSubmit()} disabled={busy || !canSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <Field
            label="RUC"
            required
            error={showRucError ? rucMessage ?? undefined : undefined}
            hint={!isEdit && !rucMessage ? rucKind(form.ruc) : undefined}
          >
            <div className="relative">
              <input
                className={inputClass(showRucError, "font-mono tracking-wide pr-9")}
                value={form.ruc}
                onChange={(e) => set("ruc", e.target.value.replace(/\D/g, "").slice(0, 11))}
                onBlur={() => setTouchedRuc(true)}
                placeholder="20512345671"
                disabled={isEdit}
                inputMode="numeric"
                autoFocus={!isEdit}
              />
              {!isEdit && !rucMessage && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />}
            </div>
          </Field>
          <Field label="Nombre o razón social" required>
            <input className={inputClass()} value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Distribuidora Andina S.A.C." />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Persona de contacto"><input className={inputClass()} value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Nombre del vendedor" /></Field>
          <Field label="Teléfono"><input className={inputClass()} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="987 654 321" inputMode="tel" /></Field>
          <Field label="Correo"><input type="email" className={inputClass()} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ventas@proveedor.pe" /></Field>
          <Field label="Dirección"><input className={inputClass()} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Av. Argentina 123, Lima" /></Field>
        </div>

        {customFields.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface-soft/50 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              <Columns3 className="h-3.5 w-3.5" /> Tus columnas
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {customFields.map((f) => (
                <Field key={f.id} label={f.label} required={f.is_required}>
                  <CustomFieldInput field={f} value={custom[f.key]} onChange={(v) => setCustom((c) => ({ ...c, [f.key]: v }))} />
                </Field>
              ))}
            </div>
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}

function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : hint ? <span className="mt-1 block text-xs text-success">{hint}</span> : null}
    </div>
  );
}
