"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Columns3, FileSpreadsheet, Layers, Loader2, MousePointerClick,
  PackagePlus, PartyPopper, Plus, Sparkles, Tag, Trash2, X, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useProfile } from "@/hooks/useProfile";
import { usePlan } from "@/hooks/usePlan";
import { categoriesApi, companiesApi, productsApi } from "@/lib/api";
import { customFieldsApi, preferencesApi } from "@/lib/apis/custom-fields";
import { slugify } from "@/lib/import/parse";
import { ONBOARDING_PREF, completeOnboarding, startGuidedTour } from "@/lib/onboarding";
import { BUSINESS_PRESETS, type BusinessPreset } from "@/components/onboarding/business-presets";
import { DemoPlayer } from "@/components/onboarding/DemoPlayer";
import { ProductImportWizard } from "@/components/inventory/ProductImportWizard";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import type { CategoryDTO } from "@/types/api";
import { CUSTOM_FIELD_TYPE_LABEL, type CustomFieldDTO, type CustomFieldType } from "@/types/custom-fields";

type StepId = "intro" | "business" | "types" | "columns" | "load" | "demo" | "done";

const STEPS: { id: StepId; label: string }[] = [
  { id: "intro", label: "Bienvenida" },
  { id: "business", label: "Tu negocio" },
  { id: "types", label: "Tipos de producto" },
  { id: "columns", label: "Columnas" },
  { id: "load", label: "Primera carga" },
  { id: "demo", label: "Cómo funciona" },
  { id: "done", label: "Listo" },
];

type ColDraft = {
  id: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  /** Product type names; [] = every product. */
  types: string[];
  enabled: boolean;
};

const TYPE_OPTIONS = (Object.keys(CUSTOM_FIELD_TYPE_LABEL) as CustomFieldType[]).map((t) => ({ value: t, label: CUSTOM_FIELD_TYPE_LABEL[t] }));

const rise = (i: number): React.CSSProperties => ({ animation: `fade-up 0.6s var(--ease-out) ${0.06 + i * 0.07}s both` });
const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * Full-screen onboarding for a brand-new account: pick the business, shape product types
 * and their own columns, optionally do a first load, then watch the product demo (which
 * hits the Premium wall at the FTGM forecast on the free plan) and jump into the tour.
 */
export default function WelcomePage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const { user, company } = useProfile();
  const plan = usePlan();

  const [step, setStep] = useState<StepId>("intro");
  const [preset, setPreset] = useState<BusinessPreset | null>(null);
  const [cats, setCats] = useState<CategoryDTO[]>([]);
  const [fields, setFields] = useState<CustomFieldDTO[]>([]);
  const [typeNames, setTypeNames] = useState<string[]>([]);
  const [typeDraft, setTypeDraft] = useState("");
  const [cols, setCols] = useState<ColDraft[]>([]);
  const [colDraft, setColDraft] = useState("");
  const [previewType, setPreviewType] = useState<string>("");
  const [productCount, setProductCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [demoDone, setDemoDone] = useState(false);

  const loadCats = useCallback(async () => {
    if (!companyId) return [] as CategoryDTO[];
    const c = await categoriesApi.list(companyId);
    setCats(c);
    return c;
  }, [companyId]);
  const loadFields = useCallback(async () => {
    if (!companyId) return [] as CustomFieldDTO[];
    const f = await customFieldsApi.list(companyId, "product");
    setFields(f);
    return f;
  }, [companyId]);
  const loadProducts = useCallback(async () => {
    if (!companyId) return;
    const p = await productsApi.list(companyId);
    setProductCount(p.length);
  }, [companyId]);

  useEffect(() => {
    loadCats().catch(() => undefined);
    loadFields().catch(() => undefined);
    loadProducts().catch(() => undefined);
  }, [loadCats, loadFields, loadProducts]);

  const idx = STEPS.findIndex((s) => s.id === step);
  const go = (id: StepId) => {
    setError(null);
    setStep(id);
    document.getElementById("welcome-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => go(STEPS[Math.max(0, idx - 1)].id);

  const finish = (tour: boolean) => {
    completeOnboarding();
    if (companyId) preferencesApi.put(companyId, ONBOARDING_PREF, { completed_at: new Date().toISOString() }).catch(() => undefined);
    if (tour) startGuidedTour();
    router.push("/dashboard");
  };

  const rootNames = useMemo(() => cats.filter((c) => !c.parent_id).map((c) => c.name), [cats]);
  const existingLower = useMemo(() => new Set(cats.map((c) => c.name.toLowerCase())), [cats]);

  // ─── Step actions ────────────────────────────────────────────────────────
  const choosePreset = (p: BusinessPreset) => {
    setPreset(p);
    const names = Array.from(new Map([...rootNames, ...p.types].map((n) => [n.toLowerCase(), n])).values());
    setTypeNames(names);
    const byId = new Map(cats.map((c) => [c.id, c.name]));
    const existingDrafts: ColDraft[] = fields.map((f) => ({
      id: f.id,
      label: f.label,
      field_type: f.field_type,
      options: f.options,
      types: f.category_ids.map((id) => byId.get(id)).filter(Boolean) as string[],
      enabled: true,
    }));
    const taken = new Set(fields.map((f) => f.key));
    setCols([
      ...existingDrafts,
      ...p.columns
        .filter((c) => !taken.has(slugify(c.label)))
        .map((c) => ({ id: uid(), label: c.label, field_type: c.field_type, options: c.options ?? [], types: c.types, enabled: true })),
    ]);
    setPreviewType(names[0] ?? "");
    if (companyId) companiesApi.update(companyId, { business_type: p.label }).catch(() => undefined);
    go("types");
  };

  const addType = () => {
    const name = typeDraft.trim();
    if (!name || typeNames.some((n) => n.toLowerCase() === name.toLowerCase())) return setTypeDraft("");
    setTypeNames((t) => [...t, name]);
    setTypeDraft("");
  };
  const removeType = (name: string) => {
    setTypeNames((t) => t.filter((n) => n !== name));
    setCols((cs) => cs.map((c) => ({ ...c, types: c.types.filter((n) => n !== name) })));
  };

  const saveTypes = async () => {
    if (!companyId) return;
    setSaving(true);
    setError(null);
    try {
      for (const name of typeNames) {
        if (!existingLower.has(name.toLowerCase())) await categoriesApi.create(companyId, { name });
      }
      await loadCats();
      if (!typeNames.includes(previewType)) setPreviewType(typeNames[0] ?? "");
      go("columns");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron crear los tipos de producto.");
    } finally {
      setSaving(false);
    }
  };

  const addCol = () => {
    const label = colDraft.trim();
    if (!label) return;
    setCols((cs) => [...cs, { id: uid(), label, field_type: "text", options: [], types: [], enabled: true }]);
    setColDraft("");
  };
  const patchCol = (id: string, patch: Partial<ColDraft>) => setCols((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const saveColumns = async () => {
    if (!companyId) return;
    setSaving(true);
    setError(null);
    try {
      const fresh = await loadCats();
      const idByName = new Map(fresh.map((c) => [c.name.toLowerCase(), c.id]));
      const existing = await customFieldsApi.list(companyId, "product");
      for (const d of cols.filter((c) => c.enabled && c.label.trim())) {
        const key = slugify(d.label);
        const ids = d.types.map((n) => idByName.get(n.toLowerCase())).filter(Boolean) as string[];
        const found = existing.find((f) => f.key === key);
        if (found) await customFieldsApi.update(companyId, found.id, { category_ids: ids });
        else
          await customFieldsApi.create(companyId, {
            entity: "product",
            label: d.label.trim(),
            field_type: d.field_type,
            options: d.field_type === "select" ? d.options : [],
            category_ids: ids,
          });
      }
      await loadFields();
      go("load");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar las columnas.");
    } finally {
      setSaving(false);
    }
  };

  const firstName = user?.full_name?.split(" ")[0];
  const enabledCols = cols.filter((c) => c.enabled && c.label.trim());
  const previewCols = enabledCols.filter((c) => c.types.length === 0 || c.types.includes(previewType));

  return (
    <div className="relative h-screen overflow-hidden bg-background text-text-primary">
      {/* Backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 85% 0%, rgb(var(--c-primary) / 0.12), transparent 70%)," +
            "radial-gradient(45% 45% at 0% 100%, rgb(var(--c-accent) / 0.10), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(rgb(var(--c-text) / 0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div id="welcome-scroll" className="relative h-full overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
            <span className="font-display text-[17px] font-bold tracking-[-0.03em]">
              Inventory<span className="text-primary">DSS</span>
            </span>
            <ol className="hidden flex-1 items-center gap-1.5 md:flex" aria-label="Progreso">
              {STEPS.map((s, i) => (
                <li key={s.id} className="flex flex-1 flex-col gap-1.5">
                  <span className="h-1 overflow-hidden rounded-full bg-surface-muted">
                    <span className="block h-full rounded-full bg-primary transition-all duration-700 [transition-timing-function:var(--ease-out)]" style={{ width: i < idx ? "100%" : i === idx ? "50%" : "0%" }} />
                  </span>
                  <span className={cn("truncate text-[10.5px] font-medium transition-colors", i === idx ? "text-text-primary" : "text-text-muted")}>{s.label}</span>
                </li>
              ))}
            </ol>
            <span className="text-xs text-text-muted md:hidden">{idx + 1} / {STEPS.length}</span>
            {step !== "done" && (
              <button type="button" onClick={() => finish(false)} className="ml-auto shrink-0 text-sm text-text-muted transition-colors hover:text-text-primary md:ml-0">
                Saltar por ahora
              </button>
            )}
          </div>
        </header>

        <main key={step} className="mx-auto max-w-6xl px-6 pb-16 pt-10">
          {error && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" style={rise(0)}>
              {error}
              <button type="button" onClick={() => setError(null)} aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* ── Intro ─────────────────────────────────────────────── */}
          {step === "intro" && (
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary" style={rise(0)}>Bienvenido a InventoryDSS</p>
                <h1 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.04em]" style={rise(1)}>
                  Hola{firstName ? `, ${firstName}` : ""}.<br />
                  Dejemos <span className="text-primary">{company?.name ?? "tu negocio"}</span> listo en 3 minutos.
                </h1>
                <p className="mt-5 max-w-md text-base leading-relaxed text-text-secondary" style={rise(2)}>
                  Te guiamos paso a paso: adaptamos el sistema a tu rubro, creas tus columnas, haces tu primera carga y te mostramos cómo funciona todo.
                </p>
                <ul className="mt-7 space-y-3" style={rise(3)}>
                  {[
                    { icon: Columns3, t: "Columnas a tu medida", d: "Unas para Ropa, otras para Electro — cada tipo con las suyas." },
                    { icon: FileSpreadsheet, t: "Carga tu Excel", d: "Con vista previa editable antes de guardar." },
                    { icon: MousePointerClick, t: "Aprende viéndolo", d: "Una demo animada y un recorrido sobre la app real." },
                  ].map((f) => (
                    <li key={f.t} className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><f.icon className="h-4 w-4" /></span>
                      <span>
                        <span className="block text-sm font-semibold">{f.t}</span>
                        <span className="block text-sm text-text-secondary">{f.d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap items-center gap-3" style={rise(4)}>
                  <button type="button" onClick={() => go("business")} className="btn btn-primary h-12 gap-2 rounded-2xl px-6 text-[15px]">
                    Empezar <ArrowRight className="h-4 w-4" />
                  </button>
                  <span className="flex items-center gap-1.5 text-xs text-text-muted"><Clock className="h-3.5 w-3.5" /> Unos 3 minutos · puedes saltar cualquier paso</span>
                </div>
              </div>
              <div style={rise(2)}>
                <DemoPlayer chapters={["map"]} premium={plan.isPremium} loop variant="compact" />
              </div>
            </div>
          )}

          {/* ── Business ──────────────────────────────────────────── */}
          {step === "business" && (
            <div>
              <StepHeading i={0} eyebrow="Paso 1 · Tu negocio" title="¿A qué se dedica tu negocio?" text="Lo usamos para sugerirte tipos de producto y columnas. Todo es editable después." />
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BUSINESS_PRESETS.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choosePreset(p)}
                    style={rise(i + 1)}
                    className={cn(
                      "group relative overflow-hidden rounded-3xl border bg-surface p-5 text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg",
                      preset?.id === p.id ? "border-primary/50 ring-4 ring-primary/10" : "border-border hover:border-primary/30",
                    )}
                  >
                    <span aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-110"><p.icon className="h-5 w-5" /></span>
                    <p className="mt-4 font-display text-base font-semibold">{p.label}</p>
                    <p className="text-sm text-text-secondary">{p.tagline}</p>
                    {p.types.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {p.types.slice(0, 4).map((t) => (
                          <span key={t} className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] text-text-muted">{t}</span>
                        ))}
                      </div>
                    )}
                    <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100" />
                  </button>
                ))}
              </div>
              <NavRow onBack={back} />
            </div>
          )}

          {/* ── Types ─────────────────────────────────────────────── */}
          {step === "types" && (
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div>
                <StepHeading i={0} eyebrow="Paso 2 · Tipos de producto" title="¿Qué tipos de producto vendes?" text="Son tus categorías principales. Sirven para ordenar tu catálogo y para que cada tipo tenga sus propias columnas." />
                <div className="mt-8 flex flex-wrap gap-2" style={rise(1)}>
                  {typeNames.map((n) => {
                    const exists = existingLower.has(n.toLowerCase());
                    return (
                      <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-3.5 pr-1.5 text-sm font-medium shadow-soft" style={{ animation: "scale-in 0.3s var(--ease-out) both" }}>
                        <Tag className="h-3.5 w-3.5 text-primary" /> {n}
                        {exists ? (
                          <span className="rounded-full bg-success-soft px-1.5 text-[10px] font-semibold text-success">creado</span>
                        ) : (
                          <button type="button" onClick={() => removeType(n)} className="grid h-6 w-6 place-items-center rounded-full text-text-muted hover:bg-surface-muted hover:text-danger" aria-label={`Quitar ${n}`}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                  {typeNames.length === 0 && <p className="text-sm text-text-muted">Aún no agregaste tipos. Escribe el primero abajo.</p>}
                </div>
                <div className="mt-5 flex max-w-md items-center gap-2" style={rise(2)}>
                  <input
                    value={typeDraft}
                    onChange={(e) => setTypeDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addType()}
                    placeholder="Agregar tipo (ej. Electro, Juguetes)"
                    className="h-11 flex-1 rounded-xl border border-border bg-surface px-4 text-sm placeholder:text-text-muted focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                  <button type="button" onClick={addType} disabled={!typeDraft.trim()} className="btn btn-secondary h-11 gap-1.5 px-4 text-sm">
                    <Plus className="h-4 w-4" /> Agregar
                  </button>
                </div>
                <NavRow onBack={back} onNext={saveTypes} nextLabel={typeNames.length ? "Guardar y continuar" : "Continuar sin tipos"} busy={saving} />
              </div>
              <aside className="hidden lg:block" style={rise(2)}>
                <div className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Así se ordena tu catálogo</p>
                  <div className="mt-4 space-y-2">
                    {(typeNames.length ? typeNames : ["Tus tipos aparecerán aquí"]).slice(0, 6).map((n, i) => (
                      <div key={n} className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface-soft/60 px-3 py-2.5" style={{ animation: `fade-up 0.4s var(--ease-out) ${i * 0.05}s both` }}>
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary"><Layers className="h-4 w-4" /></span>
                        <span className="flex-1 text-sm font-medium">{n}</span>
                        <span className="h-2 w-10 rounded-full bg-surface-muted" />
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-text-muted">Luego podrás crear subtipos (ej. Ropa › Polos) desde Catálogo.</p>
                </div>
              </aside>
            </div>
          )}

          {/* ── Columns ───────────────────────────────────────────── */}
          {step === "columns" && (
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
                <StepHeading i={0} eyebrow="Paso 3 · Columnas" title="Personaliza la ficha de tus productos" text="Activa las columnas que te sirven y elige a qué tipos aplica cada una. Un polo tendrá Talla; un foco, Voltaje." />
                <div className="mt-8 space-y-3">
                  {cols.map((c, i) => (
                    <div
                      key={c.id}
                      style={rise(Math.min(i, 6) + 1)}
                      className={cn("rounded-2xl border bg-surface p-4 shadow-soft transition-all", c.enabled ? "border-border" : "border-border-soft opacity-60")}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={c.enabled}
                          onClick={() => patchCol(c.id, { enabled: !c.enabled })}
                          className={cn("flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors", c.enabled ? "bg-primary" : "bg-surface-muted")}
                          aria-label={c.enabled ? "Desactivar columna" : "Activar columna"}
                        >
                          <span className={cn("h-5 w-5 rounded-full bg-surface shadow-soft transition-transform", c.enabled && "translate-x-4")} />
                        </button>
                        <input
                          value={c.label}
                          onChange={(e) => patchCol(c.id, { label: e.target.value })}
                          className="h-9 min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-2 font-medium hover:border-border focus:border-primary/40 focus:bg-surface-soft focus:outline-none"
                        />
                        <div className="w-44">
                          <Select size="sm" value={c.field_type} options={TYPE_OPTIONS} onChange={(v) => patchCol(c.id, { field_type: v as CustomFieldType })} />
                        </div>
                        <button type="button" onClick={() => setCols((cs) => cs.filter((x) => x.id !== c.id))} className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-danger-soft hover:text-danger" aria-label="Quitar columna">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {c.field_type === "select" && (
                        <input
                          value={c.options.join(", ")}
                          onChange={(e) => patchCol(c.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                          placeholder="Opciones separadas por coma"
                          className="mt-2 h-9 w-full rounded-lg border border-border bg-surface-soft px-3 text-xs focus:border-primary/40 focus:outline-none"
                        />
                      )}
                      {typeNames.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="mr-1 text-[11px] font-semibold text-text-muted">Aplica a:</span>
                          <button
                            type="button"
                            onClick={() => patchCol(c.id, { types: [] })}
                            className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", c.types.length === 0 ? "border-primary/40 bg-primary-soft text-primary" : "border-border text-text-secondary hover:text-text-primary")}
                          >
                            <Layers className="h-3 w-3" /> Todos
                          </button>
                          {typeNames.map((n) => {
                            const on = c.types.includes(n);
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => patchCol(c.id, { types: on ? c.types.filter((x) => x !== n) : [...c.types, n] })}
                                className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", on ? "border-accent-violet/40 bg-accent-violet-soft text-accent-violet" : "border-border text-text-secondary hover:text-text-primary")}
                              >
                                {on && <Check className="h-3 w-3" />} {n}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border p-2 pl-4">
                    <Plus className="h-4 w-4 text-text-muted" />
                    <input
                      value={colDraft}
                      onChange={(e) => setColDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCol()}
                      placeholder="Nueva columna (ej. Garantía, Sabor, Modelo)"
                      className="h-9 flex-1 bg-transparent text-sm placeholder:text-text-muted focus:outline-none"
                    />
                    <button type="button" onClick={addCol} disabled={!colDraft.trim()} className="btn btn-secondary h-9 px-3 text-sm">Agregar</button>
                  </div>
                </div>
                <NavRow onBack={back} onNext={saveColumns} nextLabel={enabledCols.length ? `Crear ${enabledCols.length} columna(s)` : "Continuar sin columnas"} busy={saving} />
              </div>

              <aside className="lg:sticky lg:top-24 lg:self-start" style={rise(2)}>
                <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Vista previa de la ficha
                </p>
                {typeNames.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {typeNames.map((n) => (
                      <button key={n} type="button" onClick={() => setPreviewType(n)} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", previewType === n ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary")}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                <div key={previewType} className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft-lg" style={{ animation: "fade-up 0.4s var(--ease-out) both" }}>
                  <div className="flex items-center gap-3 border-b border-border-soft px-5 py-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary-soft to-accent-violet-soft text-primary"><PackagePlus className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold">Nuevo producto</p>
                      <p className="text-xs text-text-muted">Tipo: {previewType || "Sin tipo"}</p>
                    </div>
                  </div>
                  <div className="space-y-3 px-5 py-4">
                    {["Nombre", "Precio de venta", "Stock inicial"].map((l) => (
                      <div key={l}>
                        <p className="mb-1 text-[11px] text-text-muted">{l}</p>
                        <div className="h-8 rounded-lg border border-border-soft bg-surface-soft" />
                      </div>
                    ))}
                    <div className="h-px bg-border-soft" />
                    {previewCols.length === 0 ? (
                      <p className="py-2 text-center text-xs text-text-muted">Sin columnas propias para este tipo</p>
                    ) : (
                      previewCols.map((c, i) => (
                        <div key={c.id} style={{ animation: `fade-up 0.35s var(--ease-out) ${i * 0.04}s both` }}>
                          <p className={cn("mb-1 flex items-center justify-between text-[11px] font-medium", c.types.length ? "text-accent-violet" : "text-text-secondary")}>
                            {c.label}
                            <span className="text-[10px] font-normal text-text-muted">{c.types.length ? `solo ${previewType}` : "todos"}</span>
                          </p>
                          <div className="flex h-8 items-center rounded-lg border border-border-soft bg-surface-soft px-2.5 text-[11px] text-text-muted">
                            {c.field_type === "select" ? c.options.slice(0, 3).join(" · ") || "Selecciona…" : CUSTOM_FIELD_TYPE_LABEL[c.field_type]}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* ── First load ────────────────────────────────────────── */}
          {step === "load" && (
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div>
                <StepHeading i={0} eyebrow="Paso 4 · Primera carga" title="Carga tus productos" text="Sube tu Excel tal como lo tienes o crea un producto a mano. Si prefieres, hazlo después desde Inventario." />
                {productCount != null && productCount > 0 && (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-success/25 bg-success-soft/50 px-4 py-3 text-sm" style={rise(1)}>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-success text-white"><Check className="h-4 w-4" /></span>
                    <span><strong>{productCount}</strong> producto(s) ya están en tu inventario.</span>
                  </div>
                )}
                <div className="mt-6 space-y-3">
                  {[
                    { icon: FileSpreadsheet, t: "Subir mi Excel o CSV", d: "Detectamos columnas, ves la vista previa y corriges antes de guardar.", tag: "Recomendado", onClick: () => setImportOpen(true) },
                    { icon: PackagePlus, t: "Crear un producto", d: "Con foto, precio, stock y las columnas de su tipo.", onClick: () => setProductOpen(true) },
                    { icon: Clock, t: "Lo haré después", d: "Sigue con la demo; la carga está en Inventario › Importar.", onClick: () => go("demo") },
                  ].map((o, i) => (
                    <button
                      key={o.t}
                      type="button"
                      onClick={o.onClick}
                      style={rise(i + 2)}
                      className="group flex w-full items-center gap-4 rounded-3xl border border-border bg-surface p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-lg"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-105"><o.icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          {o.t}
                          {o.tag && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary">{o.tag}</span>}
                        </span>
                        <span className="block text-sm text-text-secondary">{o.d}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
                <NavRow onBack={back} onNext={() => go("demo")} nextLabel="Continuar" />
              </div>
              <div style={rise(2)}>
                <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Así funciona la carga
                </p>
                <DemoPlayer chapters={["import"]} premium={plan.isPremium} loop variant="compact" />
              </div>
            </div>
          )}

          {/* ── Demo ──────────────────────────────────────────────── */}
          {step === "demo" && (
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary" style={rise(0)}>Paso 5 · Cómo funciona</p>
                <h2 className="mt-3 font-display text-[clamp(1.8rem,3.6vw,2.8rem)] font-semibold tracking-[-0.035em]" style={rise(1)}>
                  Todo InventoryDSS en un minuto
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-text-secondary" style={rise(2)}>
                  Del mapa de la app a tu primera venta y al Motor FTGM. Haz clic para pausar o salta a cualquier capítulo.
                </p>
              </div>
              <div className="mt-8" style={rise(3)}>
                <DemoPlayer premium={plan.isPremium} onFinished={() => setDemoDone(true)} onUpgrade={() => router.push("/premium")} />
              </div>
              <NavRow onBack={back} onNext={() => go("done")} nextLabel={demoDone ? "Continuar" : "Saltar la demo"} />
            </div>
          )}

          {/* ── Done ──────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="mx-auto max-w-2xl text-center">
              <div className="relative mx-auto grid h-20 w-20 place-items-center" style={rise(0)}>
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "2.4s" }} />
                <span className="relative grid h-20 w-20 place-items-center rounded-full bg-primary text-on-primary shadow-glow"><PartyPopper className="h-9 w-9" /></span>
              </div>
              <h2 className="mt-7 font-display text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.035em]" style={rise(1)}>
                ¡{company?.name ?? "Tu negocio"} está listo!
              </h2>
              <p className="mx-auto mt-3 max-w-md text-text-secondary" style={rise(2)}>
                Ahora te mostramos dónde está cada opción directamente sobre la app, o entra y explora por tu cuenta.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" style={rise(3)}>
                {[
                  { l: "Tipos de producto", v: cats.filter((c) => !c.parent_id).length },
                  { l: "Columnas propias", v: fields.length },
                  { l: "Productos", v: productCount ?? 0 },
                  { l: "Plan", v: plan.isPremium ? "Premium" : "Gratis" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft">
                    <p className="font-display text-2xl font-semibold tabular-nums">{s.v}</p>
                    <p className="text-xs text-text-muted">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3" style={rise(4)}>
                <button type="button" onClick={() => finish(true)} className="btn btn-primary h-12 gap-2 rounded-2xl px-6 text-[15px]">
                  <MousePointerClick className="h-4 w-4" /> Hacer el recorrido guiado
                </button>
                <button type="button" onClick={() => finish(false)} className="btn btn-secondary h-12 gap-2 rounded-2xl px-5 text-[15px]">
                  Ir a mi panel <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <ProductImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        companyId={companyId}
        fields={fields}
        onFinished={() => {
          loadProducts().catch(() => undefined);
          loadFields().catch(() => undefined);
          loadCats().catch(() => undefined);
        }}
      />
      <ProductFormModal
        open={productOpen}
        onClose={() => setProductOpen(false)}
        companyId={companyId}
        product={null}
        categories={cats}
        fields={fields}
        onSaved={() => loadProducts().catch(() => undefined)}
      />
    </div>
  );
}

function StepHeading({ i, eyebrow, title, text }: { i: number; eyebrow: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary" style={rise(i)}>{eyebrow}</p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-tight tracking-[-0.035em]" style={rise(i + 1)}>{title}</h2>
      <p className="mt-3 max-w-xl text-text-secondary" style={rise(i + 2)}>{text}</p>
    </div>
  );
}

function NavRow({ onBack, onNext, nextLabel, busy }: { onBack: () => void; onNext?: () => void; nextLabel?: string; busy?: boolean }) {
  return (
    <div className="mt-10 flex items-center justify-between gap-3">
      <button type="button" onClick={onBack} disabled={busy} className="btn btn-ghost h-11 gap-1.5 px-4 text-sm">
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>
      {onNext && (
        <button type="button" onClick={onNext} disabled={busy} className="btn btn-primary h-11 gap-2 rounded-xl px-5 text-sm">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {nextLabel ?? "Continuar"} {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
