"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, FolderPlus, FolderTree, Layers, Package, PackagePlus, Pencil, Search, Tag, Upload,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { CategoryFormModal } from "@/components/products/CategoryFormModal";
import { ProductThumb } from "@/components/products/ProductThumb";
import { categoryPath, childrenOf, descendantIds } from "@/components/products/categoryTree";
import { ProductImportWizard } from "@/components/inventory/ProductImportWizard";
import { cn } from "@/lib/utils";
import { inputClass, soles } from "@/lib/ui";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useColumnConfig } from "@/hooks/useColumnConfig";
import { categoriesApi, productsApi } from "@/lib/api";
import type { CategoryDTO, ProductDTO } from "@/types/api";

export default function ProductsPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const categories = useApi(() => (companyId ? categoriesApi.list(companyId) : Promise.resolve([])), [companyId]);
  const columns = useColumnConfig(companyId, "product");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const cats = categories.data ?? [];
  const items = products.data ?? [];

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openCategory = (category: CategoryDTO | null, parentId: string | null = null) => {
    setEditingCategory(category);
    setDefaultParentId(parentId);
    setCategoryFormOpen(true);
  };

  const countOf = useMemo(() => {
    const direct = new Map<string, number>();
    for (const p of items) if (p.category_id) direct.set(p.category_id, (direct.get(p.category_id) ?? 0) + 1);
    return (id: string) => [...descendantIds(cats, id)].reduce((sum, cid) => sum + (direct.get(cid) ?? 0), 0);
  }, [items, cats]);

  const visible = useMemo(() => {
    const allowed = selectedCategoryId ? descendantIds(cats, selectedCategoryId) : null;
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (!showInactive && !p.is_active) return false;
      if (allowed && !(p.category_id && allowed.has(p.category_id))) return false;
      if (!q) return true;
      return [p.name, p.sku, p.barcode ?? ""].some((s) => s.toLowerCase().includes(q));
    });
  }, [items, cats, selectedCategoryId, query, showInactive]);

  const brands = childrenOf(cats, null).length;
  const types = cats.length - brands;
  const active = items.filter((p) => p.is_active).length;
  const uncategorized = items.filter((p) => !p.category_id).length;
  const withPhoto = items.filter((p) => p.image_url).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ERP · Catálogo"
        title="Catálogo"
        description="Tu árbol de productos: marca › tipo › producto. Haz clic en un producto para ver su historia completa."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => openCategory(null)} disabled={!companyId}>
              <FolderPlus className="h-4 w-4" /> Nueva marca
            </Button>
            <Button variant="secondary" onClick={() => setImportOpen(true)} disabled={!companyId}>
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <Button onClick={openCreate} disabled={!companyId}>
              <PackagePlus className="h-4 w-4" /> Nuevo producto
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Productos activos" value={active} sub={`${items.length - active} inactivos`} />
        <Tile label="Marcas" value={brands} sub={`${types} tipos`} />
        <Tile label="Sin categoría" value={uncategorized} sub={uncategorized ? "Asígnales una marca" : "Todo organizado"} tone={uncategorized ? "warning" : undefined} />
        <Tile label="Con foto" value={withPhoto} sub={items.length ? `${Math.round((withPhoto / items.length) * 100)}% del catálogo` : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-text-primary">Árbol del catálogo</h3>
            </div>
            <button
              onClick={() => openCategory(null)}
              disabled={!companyId}
              title="Nueva marca"
              className="grid h-7 w-7 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-soft hover:text-primary disabled:opacity-40"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedCategoryId(null)}
            className={cn(
              "mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              selectedCategoryId === null ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-surface-soft",
            )}
          >
            <span className="flex items-center gap-2"><Layers className="h-4 w-4" /> Todos los productos</span>
            <span className="text-xs tabular-nums">{items.length}</span>
          </button>

          {cats.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">
              Sin categorías todavía. Crea tu primera marca con <FolderPlus className="inline h-3 w-3" />.
            </div>
          ) : (
            <TreeLevel
              categories={cats}
              parentId={null}
              depth={0}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              onEdit={(c) => openCategory(c)}
              onAddChild={(id) => openCategory(null, id)}
              countOf={countOf}
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input className={inputClass(false, "pl-10")} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, SKU o código de barras" />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-[rgb(var(--c-primary))]" />
              Mostrar inactivos
            </label>
          </Card>

          <DataState
            loading={products.loading && !products.data}
            error={products.error}
            empty={visible.length === 0}
            onRetry={products.reload}
            emptyState={
              items.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Empieza tu catálogo"
                  description="Registra tus productos con foto, código, costo y precio, u organízalos importando tu Excel."
                  action={{ label: "Nuevo producto", onClick: openCreate }}
                />
              ) : (
                <EmptyState
                  icon={FolderTree}
                  title="Sin productos aquí"
                  description="Ningún producto coincide con esta rama del árbol o con tu búsqueda."
                  action={{ label: "Ver todos", onClick: () => { setSelectedCategoryId(null); setQuery(""); } }}
                />
              )
            }
          >
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h3 className="font-display text-[15px] font-semibold text-text-primary">
                  {selectedCategoryId ? categoryPath(cats, selectedCategoryId).join(" › ") : "Todos los productos"}
                </h3>
                <span className="text-xs text-text-muted">{visible.length} productos</span>
              </div>
              <ul className="divide-y divide-border-soft">
                {visible.map((p) => {
                  const path = categoryPath(cats, p.category_id);
                  const price = Number(p.unit_price);
                  const margin = price > 0 ? ((price - Number(p.unit_cost)) / price) * 100 : null;
                  return (
                    <li
                      key={p.id}
                      onClick={() => router.push(`/inventory/${p.id}`)}
                      className="group flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-primary-softer/60"
                    >
                      <ProductThumb src={p.image_url} name={p.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-text-primary">{p.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                          <span className="font-mono">{p.sku}</span>
                          {path.length > 0 ? (
                            <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {path.join(" › ")}</span>
                          ) : (
                            <span className="text-warning">Sin categoría</span>
                          )}
                          {!p.is_active && <Badge>Inactivo</Badge>}
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="font-display font-semibold tabular-nums text-text-primary">{soles(price)}</p>
                        <p className="text-xs tabular-nums text-text-muted">
                          Costo {soles(p.unit_cost)}{margin != null && ` · ${margin.toFixed(0)}%`}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditing(p); setFormOpen(true); }}
                        title="Editar"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted opacity-0 transition hover:bg-surface hover:text-primary group-hover:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                    </li>
                  );
                })}
              </ul>
            </Card>
          </DataState>
        </div>
      </div>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        companyId={companyId}
        product={editing}
        categories={cats}
        fields={columns.fields}
        onSaved={products.reload}
      />
      <CategoryFormModal
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        companyId={companyId}
        category={editingCategory}
        defaultParentId={defaultParentId}
        categories={cats}
        onSaved={categories.reload}
      />
      <ProductImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        companyId={companyId}
        fields={columns.fields}
        onFinished={() => { products.reload(); categories.reload(); columns.reloadFields(); }}
      />
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: number; sub: string; tone?: "warning" }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">{label}</p>
      <p className={cn("mt-1.5 font-display text-2xl font-bold tabular-nums", tone === "warning" ? "text-warning" : "text-text-primary")}>{value}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>
    </Card>
  );
}

function TreeLevel({
  categories, parentId, depth, selectedId, onSelect, onEdit, onAddChild, countOf,
}: {
  categories: CategoryDTO[];
  parentId: string | null;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (c: CategoryDTO) => void;
  onAddChild: (parentId: string) => void;
  countOf: (id: string) => number;
}) {
  const nodes = childrenOf(categories, parentId);
  if (nodes.length === 0) return null;
  return (
    <div className={depth > 0 ? "ml-4 border-l border-border-soft pl-2" : ""}>
      {nodes.map((c) => {
        const kids = childrenOf(categories, c.id);
        const isSelected = selectedId === c.id;
        return (
          <div key={c.id}>
            <div
              className={cn(
                "group flex cursor-pointer items-center justify-between gap-1 rounded-xl px-2.5 py-1.5 text-sm transition-colors",
                isSelected ? "bg-primary-soft font-semibold text-primary" : "text-text-secondary hover:bg-surface-soft",
              )}
              onClick={() => onSelect(c.id)}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {depth === 0 ? <Tag className="h-3.5 w-3.5 shrink-0 opacity-60" /> : <span className="h-1 w-1 shrink-0 rounded-full bg-text-muted" />}
                <span className="truncate">{c.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <span className="mr-1 text-[11px] tabular-nums text-text-muted">{countOf(c.id)}</span>
                {depth === 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddChild(c.id); }}
                    title="Añadir tipo"
                    className="hidden h-6 w-6 place-items-center rounded-lg text-text-muted hover:bg-surface hover:text-primary group-hover:grid"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                  title="Editar"
                  className="hidden h-6 w-6 place-items-center rounded-lg text-text-muted hover:bg-surface hover:text-primary group-hover:grid"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
            {kids.length > 0 && (
              <TreeLevel
                categories={categories}
                parentId={c.id}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onEdit={onEdit}
                onAddChild={onAddChild}
                countOf={countOf}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
