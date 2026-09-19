"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag, Tags, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { inputClass } from "@/lib/ui";
import { categoriesApi } from "@/lib/api";
import type { CategoryDTO } from "@/types/api";
import { categoryOptions, categoryPath } from "./categoryTree";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  /** null = create a brand-new category. */
  category: CategoryDTO | null;
  /** Preselect this as the parent when creating (e.g. "+ tipo" under a brand node). */
  defaultParentId?: string | null;
  categories: CategoryDTO[];
  onSaved: () => void;
}

export function CategoryFormModal({ open, onClose, companyId, category, defaultParentId, categories, onSaved }: Props) {
  const isEdit = category !== null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setParentId((isEdit ? category?.parent_id : defaultParentId) ?? "");
    setError(null);
    setConfirmDelete(false);
  }, [open, category, defaultParentId, isEdit]);

  const parentOptions = useMemo(
    () => categoryOptions(categories, "Ninguna (es una marca)", category?.id),
    [categories, category?.id],
  );
  const parentPath = categoryPath(categories, parentId || null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!companyId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && category) {
        await categoriesApi.update(companyId, category.id, { name: name.trim(), description: description.trim() });
      } else {
        await categoriesApi.create(companyId, {
          name: name.trim(),
          description: description.trim(),
          parent_id: parentId || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId || !category) return;
    setDeleting(true);
    setError(null);
    try {
      await categoriesApi.remove(companyId, category.id);
      onSaved();
      onClose();
    } catch {
      setError("No se pudo eliminar: primero quita sus productos y tipos.");
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;
  const isBrand = !parentId;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? (isBrand ? "Editar marca" : "Editar tipo") : isBrand ? "Nueva marca" : "Nuevo tipo"}
      description={isEdit ? categoryPath(categories, category?.id).join(" › ") : "Ordena tus productos: primero la marca (ej. Pro Plan), luego el tipo (ej. Alimento seco)."}
      footer={
        <>
          {isEdit &&
            (confirmDelete ? (
              <div className="flex flex-1 items-center gap-2">
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
                className="inline-flex flex-1 items-center gap-1.5 text-sm font-medium text-danger transition-opacity hover:opacity-80"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            ))}
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => handleSubmit()} loading={saving} disabled={busy || !name.trim()}>
            {isEdit ? "Guardar cambios" : isBrand ? "Crear marca" : "Crear tipo"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>
        )}

        {!isEdit && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { brand: true, icon: Tag, title: "Marca", text: "Ej. Pro Plan, Gloria" },
              { brand: false, icon: Tags, title: "Tipo", text: "Dentro de una marca" },
            ].map((opt) => {
              const active = isBrand === opt.brand;
              return (
                <button
                  key={opt.title}
                  type="button"
                  onClick={() => setParentId(opt.brand ? "" : parentId || (parentOptions[1]?.value ?? ""))}
                  disabled={!opt.brand && parentOptions.length <= 1}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    active ? "border-primary/30 bg-primary-softer" : "border-border bg-surface hover:bg-surface-soft",
                  )}
                >
                  <span className={cn("grid h-9 w-9 place-items-center rounded-xl", active ? "bg-primary-soft text-primary" : "bg-surface-muted text-text-muted")}>
                    <opt.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-text-primary">{opt.title}</span>
                    <span className="block text-xs text-text-muted">{opt.text}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">
            Nombre <span className="text-danger">*</span>
          </span>
          <input
            className={inputClass()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isBrand ? "Ej. Pro Plan" : "Ej. Alimento seco"}
            autoFocus
          />
        </label>

        {!isEdit && !isBrand && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-text-primary">Pertenece a</span>
            <Select value={parentId} options={parentOptions} onChange={setParentId} searchable />
            {parentPath.length > 0 && (
              <p className="mt-1.5 text-xs text-text-muted">
                Quedará como: {[...parentPath, name.trim() || "…"].join(" › ")}
              </p>
            )}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Descripción (opcional)</span>
          <textarea
            className={cn(inputClass(), "resize-none")}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
          />
        </label>
      </form>
    </Modal>
  );
}
