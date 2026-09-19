"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, ChevronDown, Columns3, Eye, EyeOff, Layers, Lock, Pencil, Plus,
  Sparkles, Tag, Trash2, X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { inputClass } from "@/lib/ui";
import { categoriesApi } from "@/lib/api";
import { customFieldsApi } from "@/lib/apis/custom-fields";
import { fieldAppliesTo, isGlobalField, scopeLabel } from "@/lib/custom-fields/scope";
import { childrenOf } from "@/components/products/categoryTree";
import { ScopePicker } from "./ScopePicker";
import type { CategoryDTO } from "@/types/api";
import {
  CUSTOM_FIELD_TYPE_LABEL,
  type CustomFieldDTO,
  type CustomFieldEntity,
  type CustomFieldType,
} from "@/types/custom-fields";

export interface BuiltinColumn {
  key: string;
  label: string;
  /** Always shown (e.g. the product name). */
  locked?: boolean;
}

interface ColumnsManagerProps {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  entity: CustomFieldEntity;
  /** e.g. "inventario", "proveedores" — used in copy. */
  entityLabel: string;
  builtinColumns: BuiltinColumn[];
  hiddenBuiltins: string[];
  onHiddenBuiltinsChange: (next: string[]) => void;
  fields: CustomFieldDTO[];
  onFieldsChanged: () => void;
  /** Product types. When given (products), columns can be scoped per type. */
  categories?: CategoryDTO[];
  onCategoriesChanged?: () => void;
}

const TYPE_OPTIONS = (Object.keys(CUSTOM_FIELD_TYPE_LABEL) as CustomFieldType[]).map((t) => ({
  value: t,
  label: CUSTOM_FIELD_TYPE_LABEL[t],
}));

type Tab = "mine" | "system";

/**
 * "Personalizar columnas": the company's own columns (with, for products, which product
 * types each one applies to) and which built-in columns are shown. For products a live
 * preview shows the product sheet each type ends up with.
 */
export function ColumnsManager({
  open,
  onClose,
  companyId,
  entity,
  entityLabel,
  builtinColumns,
  hiddenBuiltins,
  onHiddenBuiltinsChange,
  fields,
  onFieldsChanged,
  categories,
  onCategoriesChanged,
}: ColumnsManagerProps) {
  const scoped = entity === "product" && !!categories;
  const cats = categories ?? [];

  const [tab, setTab] = useState<Tab>("mine");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState("");
  const [scope, setScope] = useState<string[]>([]);
  const [scopeMode, setScopeMode] = useState<"all" | "some">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [scopeOpenId, setScopeOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewCat, setPreviewCat] = useState<string>("");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      onFieldsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el cambio.");
    } finally {
      setBusy(false);
    }
  };

  const createCategory = async (name: string) => {
    if (!companyId) return null;
    try {
      const cat = await categoriesApi.create(companyId, { name });
      onCategoriesChanged?.();
      return cat;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el tipo de producto.");
      return null;
    }
  };

  const scopeInvalid = scoped && scopeMode === "some" && scope.length === 0;

  const add = () =>
    run(async () => {
      const created = await customFieldsApi.create(companyId!, {
        entity,
        label: label.trim(),
        field_type: type,
        options: type === "select" ? options.split(",").map((o) => o.trim()).filter(Boolean) : [],
        category_ids: scoped && scopeMode === "some" ? scope : [],
      });
      setJustAdded(created.id);
      setLabel("");
      setOptions("");
      setType("text");
      setScope([]);
      setScopeMode("all");
    });

  const move = (index: number, dir: -1 | 1) => {
    const next = [...fields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(() => customFieldsApi.reorder(companyId!, entity, next.map((f) => f.id)));
  };

  const toggleBuiltin = (key: string) =>
    onHiddenBuiltinsChange(hiddenBuiltins.includes(key) ? hiddenBuiltins.filter((k) => k !== key) : [...hiddenBuiltins, key]);

  // Preview tabs: top-level product types, plus "sin tipo".
  const rootTypes = useMemo(() => childrenOf(cats, null), [cats]);
  const activePreview = previewCat || rootTypes[0]?.id || "";
  const previewFields = fields.filter((f) => fieldAppliesTo(f, activePreview || null, cats));
  const scopedCount = fields.filter((f) => !isGlobalField(f)).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personalizar columnas"
      description={
        scoped
          ? `Crea las columnas que tu negocio necesita y decide a qué tipos de producto aplica cada una.`
          : `Elige qué ves en ${entityLabel} y crea las columnas que tu negocio necesita.`
      }
      size={scoped ? "xl" : "lg"}
      footer={<Button onClick={onClose}>Listo</Button>}
    >
      <div className={cn("grid gap-6", scoped && "lg:grid-cols-[minmax(0,1fr)_300px]")}>
        <div className="min-w-0 space-y-5">
          {error && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
              <button type="button" onClick={() => setError(null)} aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Tabs */}
          <div role="tablist" className="inline-flex rounded-xl bg-surface-muted/70 p-1">
            {([
              { id: "mine", label: "Tus columnas", count: fields.length },
              { id: "system", label: "Columnas del sistema", count: builtinColumns.length },
            ] as const).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all",
                  tab === t.id ? "bg-surface text-text-primary shadow-soft" : "text-text-muted hover:text-text-secondary",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums", tab === t.id ? "bg-primary-soft text-primary" : "bg-surface text-text-muted")}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {tab === "system" && (
            <section className="animate-fade-up">
              <p className="mb-3 text-xs text-text-secondary">Oculta las columnas que no usas. Siempre puedes volver a mostrarlas.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {builtinColumns.map((c) => {
                  const visible = c.locked || !hiddenBuiltins.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      disabled={c.locked}
                      onClick={() => toggleBuiltin(c.key)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                        visible ? "border-primary/25 bg-primary-softer text-text-primary" : "border-border bg-surface-soft text-text-muted",
                        c.locked && "cursor-default",
                      )}
                    >
                      <span className="truncate font-medium">{c.label}</span>
                      {c.locked ? <Lock className="h-3.5 w-3.5 text-text-muted" /> : visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {tab === "mine" && (
            <div className="animate-fade-up space-y-5">
              {fields.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-text-secondary">
                  <Columns3 className="h-5 w-5 shrink-0 text-text-muted" />
                  <span>
                    Aún no creaste columnas propias. Agrega la primera abajo
                    {scoped ? " — por ejemplo “Talla” solo para Ropa y “Voltaje” solo para Electro." : " (por ejemplo “Marca” o “N° de cuenta”)."}
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-border-soft overflow-hidden rounded-2xl border border-border">
                  {fields.map((f, i) => {
                    const global = isGlobalField(f);
                    return (
                      <div key={f.id} className={cn("px-3.5 py-2.5 transition-colors", justAdded === f.id && "bg-primary-softer/60")}>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} className="text-text-muted hover:text-text-primary disabled:opacity-30" aria-label="Subir">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" disabled={busy || i === fields.length - 1} onClick={() => move(i, 1)} className="text-text-muted hover:text-text-primary disabled:opacity-30" aria-label="Bajar">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingId === f.id ? (
                              <div className="flex items-center gap-2">
                                <input autoFocus className={inputClass(false, "py-1.5")} value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                                <button
                                  type="button"
                                  className="rounded-lg p-1.5 text-success hover:bg-success-soft"
                                  onClick={() => run(async () => { await customFieldsApi.update(companyId!, f.id, { label: editLabel }); setEditingId(null); })}
                                  aria-label="Guardar"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button type="button" className="rounded-lg p-1.5 text-text-muted hover:bg-surface-soft" onClick={() => setEditingId(null)} aria-label="Cancelar">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className={cn("truncate text-sm font-medium", f.is_visible ? "text-text-primary" : "text-text-muted line-through decoration-text-muted/40")}>{f.label}</p>
                                <p className="truncate text-[11px] text-text-muted">
                                  {CUSTOM_FIELD_TYPE_LABEL[f.field_type]}
                                  {f.field_type === "select" && f.options.length > 0 && ` · ${f.options.join(", ")}`}
                                </p>
                              </>
                            )}
                          </div>

                          {scoped && editingId !== f.id && (
                            <button
                              type="button"
                              onClick={() => setScopeOpenId(scopeOpenId === f.id ? null : f.id)}
                              title="¿A qué productos aplica?"
                              className={cn(
                                "hidden max-w-[180px] items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors sm:inline-flex",
                                global ? "border-border bg-surface-soft text-text-secondary" : "border-accent-violet/30 bg-accent-violet-soft text-accent-violet",
                                scopeOpenId === f.id && "ring-2 ring-primary/20",
                              )}
                            >
                              {global ? <Layers className="h-3 w-3 shrink-0" /> : <Tag className="h-3 w-3 shrink-0" />}
                              <span className="truncate">{scopeLabel(f, cats)}</span>
                              <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", scopeOpenId === f.id && "rotate-180")} />
                            </button>
                          )}

                          {editingId !== f.id && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title={f.is_visible ? "Ocultar en la tabla" : "Mostrar en la tabla"}
                                onClick={() => run(() => customFieldsApi.update(companyId!, f.id, { is_visible: !f.is_visible }))}
                                className={cn("rounded-lg p-1.5 hover:bg-surface-soft", f.is_visible ? "text-primary" : "text-text-muted")}
                              >
                                {f.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                title="Renombrar"
                                onClick={() => { setEditingId(f.id); setEditLabel(f.label); }}
                                className="rounded-lg p-1.5 text-text-muted hover:bg-surface-soft hover:text-text-primary"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {confirmDeleteId === f.id ? (
                                <span className="flex items-center gap-1.5 pl-1 text-xs">
                                  <button type="button" className="font-semibold text-danger hover:underline" onClick={() => run(async () => { await customFieldsApi.remove(companyId!, f.id); setConfirmDeleteId(null); })}>
                                    Eliminar
                                  </button>
                                  <button type="button" className="text-text-muted" onClick={() => setConfirmDeleteId(null)}>No</button>
                                </span>
                              ) : (
                                <button type="button" title="Eliminar columna" onClick={() => setConfirmDeleteId(f.id)} className="rounded-lg p-1.5 text-text-muted hover:bg-danger-soft hover:text-danger">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {scoped && scopeOpenId === f.id && (
                          <div className="mt-2.5 rounded-xl border border-border-soft bg-surface-soft/60 p-3 sm:ml-7">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">¿Para qué productos es “{f.label}”?</p>
                            <ScopePicker
                              compact
                              categories={cats}
                              value={f.category_ids}
                              onChange={(next) => run(() => customFieldsApi.update(companyId!, f.id, { category_ids: next }))}
                              onCreateCategory={createCategory}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <section className="rounded-2xl border border-primary/20 bg-primary-softer/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
                  <Plus className="h-4 w-4 text-primary" /> Nueva columna
                </h3>
                <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
                  <input
                    className={inputClass()}
                    placeholder={scoped ? "Nombre (ej. Talla, Voltaje, Sabor)" : "Nombre (ej. N° de cuenta)"}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && label.trim() && !scopeInvalid && add()}
                  />
                  <Select value={type} options={TYPE_OPTIONS} onChange={(v) => setType(v as CustomFieldType)} />
                </div>
                {type === "select" && (
                  <input className={inputClass(false, "mt-3")} placeholder="Opciones separadas por coma (ej. S, M, L, XL)" value={options} onChange={(e) => setOptions(e.target.value)} />
                )}
                {scoped && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-text-secondary">¿Para qué productos?</p>
                    <ScopePicker
                      categories={cats}
                      value={scope}
                      onChange={setScope}
                      mode={scopeMode}
                      onModeChange={setScopeMode}
                      onCreateCategory={createCategory}
                    />
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button onClick={add} disabled={busy || !label.trim() || scopeInvalid}>
                    <Plus className="h-4 w-4" /> Agregar columna
                  </Button>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Live preview: the product sheet each type gets */}
        {scoped && (
          <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Vista previa por tipo
            </div>
            {rootTypes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {rootTypes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPreviewCat(c.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      activePreview === c.id ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-secondary">Crea tipos de producto para ver cómo cambia la ficha de cada uno.</p>
            )}

            <div key={activePreview} className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              <div className="flex items-center gap-3 border-b border-border-soft px-4 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-soft to-accent-violet-soft text-primary">
                  <Tag className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">Producto de ejemplo</p>
                  <p className="truncate text-[11px] text-text-muted">{cats.find((c) => c.id === activePreview)?.name ?? "Sin tipo"}</p>
                </div>
              </div>
              <div className="space-y-2 px-4 py-3">
                {["Nombre", "Precio", "Stock"].map((n) => (
                  <div key={n} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-text-muted">{n}</span>
                    <span className="h-2 w-16 rounded-full bg-surface-muted" />
                  </div>
                ))}
                <div className="my-1 h-px bg-border-soft" />
                {previewFields.length === 0 ? (
                  <p className="py-2 text-center text-[11px] text-text-muted">Sin columnas propias para este tipo</p>
                ) : (
                  previewFields.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-xs font-medium", isGlobalField(f) ? "text-text-secondary" : "text-accent-violet")}>{f.label}</span>
                      <span className="shrink-0 rounded-md border border-border-soft bg-surface-soft px-1.5 py-0.5 text-[10px] text-text-muted">
                        {CUSTOM_FIELD_TYPE_LABEL[f.field_type]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-text-muted">
              <span className="font-semibold text-accent-violet">Morado</span>: solo para este tipo. Gris: para todos.
              {scopedCount > 0 && ` Tienes ${scopedCount} columna(s) por tipo.`} Un tipo incluye sus subtipos.
            </p>
          </aside>
        )}
      </div>
    </Modal>
  );
}
