"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Boxes, ClipboardCheck, Columns3, PackagePlus,
  PackageX, Search, Upload, Wallet, TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ColumnsManager, type BuiltinColumn } from "@/components/custom-fields/ColumnsManager";
import { formatCustomValue } from "@/components/custom-fields/CustomFieldInput";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { ProductThumb } from "@/components/products/ProductThumb";
import { categoryOptions, descendantIds } from "@/components/products/categoryTree";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { ProductImportWizard } from "@/components/inventory/ProductImportWizard";
import { MoreMenu } from "@/components/simple/MoreMenu";
import { useExpertMode } from "@/hooks/useExpertMode";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useColumnConfig } from "@/hooks/useColumnConfig";
import { ancestorIds, fieldAppliesTo, isGlobalField } from "@/lib/custom-fields/scope";
import { categoriesApi } from "@/lib/api";
import { stockApi } from "@/lib/apis/inventory";
import { cn } from "@/lib/utils";
import { inputClass, soles } from "@/lib/ui";
import { STOCK_STATUS_LABEL, type InventoryOverviewItem, type StockStatus } from "@/types/inventory";

const BUILTINS: BuiltinColumn[] = [
  { key: "product", label: "Producto", locked: true },
  { key: "sku", label: "Código" },
  { key: "barcode", label: "Código de barras" },
  { key: "category", label: "Categoría" },
  { key: "stock", label: "Stock actual" },
  { key: "safety", label: "Stock mínimo" },
  { key: "reorder", label: "Comprar cuando queden" },
  { key: "cost", label: "Costo promedio" },
  { key: "price", label: "Precio" },
  { key: "value", label: "Valor en stock" },
  { key: "coverage", label: "Te alcanza para" },
  { key: "status", label: "Estado" },
  { key: "last_movement", label: "Última entrada o salida" },
];

/** Columns only shown in "Modo experto": the simple view keeps what the owner needs day to day. */
const EXPERT_ONLY = new Set(["sku", "barcode", "safety", "reorder", "cost", "value", "last_movement"]);

const STATUS_VARIANT: Record<StockStatus, "danger" | "warning" | "success"> = {
  sin_stock: "danger",
  critico: "danger",
  reordenar: "warning",
  ok: "success",
};
const STATUS_RANK: Record<StockStatus, number> = { sin_stock: 0, critico: 1, reordenar: 2, ok: 3 };

type SortDir = "asc" | "desc";
type Row = InventoryOverviewItem;

const num = (v: unknown) => Number(v ?? 0);

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InventoryPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const overview = useApi(() => (companyId ? stockApi.overview(companyId) : Promise.resolve(null)), [companyId]);
  const categories = useApi(() => (companyId ? categoriesApi.list(companyId) : Promise.resolve([])), [companyId]);
  const columns = useColumnConfig(companyId, "product");
  const [expert] = useExpertMode();

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<StockStatus | "all">("all");
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "status", dir: "asc" });
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const cats = categories.data ?? [];
  const items = overview.data?.items ?? [];
  const totals = overview.data?.totals;
  const show = (key: string) => columns.isBuiltinVisible(key) && (expert || !EXPERT_ONLY.has(key));

  const reload = () => {
    overview.reload();
    categories.reload();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowed = categoryId ? descendantIds(cats, categoryId) : null;
    const rows = items.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (allowed && !(r.category_id && allowed.has(r.category_id))) return false;
      if (!q) return true;
      return [r.name, r.sku, r.barcode ?? "", r.category_path.join(" ")].some((s) => s.toLowerCase().includes(q));
    });
    const val = (r: Row): number | string => {
      switch (sort.key) {
        case "product": return r.name.toLowerCase();
        case "sku": return r.sku;
        case "barcode": return r.barcode ?? "";
        case "category": return r.category_path.join(" › ").toLowerCase();
        case "stock": return r.stock_on_hand;
        case "safety": return r.safety_stock;
        case "reorder": return r.reorder_point;
        case "cost": return num(r.unit_cost);
        case "price": return num(r.unit_price);
        case "value": return num(r.stock_value);
        case "coverage": return r.coverage_days ?? Number.POSITIVE_INFINITY;
        case "last_movement": return r.last_movement_at ?? "";
        case "status": return STATUS_RANK[r.status] * 1e9 + r.stock_on_hand;
        default: {
          const v = r.custom_attributes?.[sort.key.replace(/^custom:/, "")];
          return typeof v === "number" ? v : String(v ?? "").toLowerCase();
        }
      }
    };
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [items, query, categoryId, status, sort, cats]);

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const catOptions = useMemo(() => categoryOptions(cats, "Todas las categorías"), [cats]);

  type Col = { key: string; header: string; align?: "right"; cell: (r: Row) => React.ReactNode };
  const tableColumns: Col[] = [
    {
      key: "product",
      header: "Producto",
      cell: (r) => (
        <div className="flex w-[300px] min-w-0 items-center gap-3">
          <ProductThumb src={r.image_url} name={r.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary" title={r.name}>{r.name}</p>
            {expert && !show("sku") && <p className="font-mono text-[11px] text-text-muted">{r.sku}</p>}
          </div>
        </div>
      ),
    },
    { key: "sku", header: "Código", cell: (r) => <span className="font-mono text-xs text-text-secondary">{r.sku}</span> },
    { key: "barcode", header: "Código de barras", cell: (r) => <span className="font-mono text-xs text-text-secondary">{r.barcode ?? "—"}</span> },
    {
      key: "category",
      header: "Categoría",
      cell: (r) =>
        r.category_path.length ? (
          <span className="text-xs text-text-secondary">
            {r.category_path.slice(0, -1).map((p) => `${p} › `)}
            <span className="font-medium text-text-primary">{r.category_path[r.category_path.length - 1]}</span>
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "stock",
      header: "Stock actual",
      align: "right",
      cell: (r) => (
        <span className={cn("font-display font-semibold tabular-nums", r.stock_on_hand <= 0 ? "text-danger" : "text-text-primary")}>
          {r.stock_on_hand.toLocaleString("es-PE")}
          <span className="ml-1 text-[11px] font-normal text-text-muted">{r.unit_of_measure === "unit" ? "u." : r.unit_of_measure}</span>
        </span>
      ),
    },
    { key: "safety", header: "Stock mínimo", align: "right", cell: (r) => <span className="tabular-nums text-text-secondary">{r.safety_stock}</span> },
    { key: "reorder", header: "Comprar cuando queden", align: "right", cell: (r) => <span className="tabular-nums text-text-secondary">{r.reorder_point}</span> },
    { key: "cost", header: "Costo promedio", align: "right", cell: (r) => <span className="tabular-nums text-text-secondary">{soles(r.unit_cost)}</span> },
    { key: "price", header: "Precio", align: "right", cell: (r) => <span className="tabular-nums font-medium">{soles(r.unit_price)}</span> },
    { key: "value", header: "Valor en stock", align: "right", cell: (r) => <span className="tabular-nums font-semibold">{soles(r.stock_value)}</span> },
    {
      key: "coverage",
      header: "Te alcanza para",
      align: "right",
      cell: (r) =>
        r.coverage_days == null ? (
          <span className="text-xs text-text-muted">Aún sin ventas</span>
        ) : (
          <span className={cn("tabular-nums", r.coverage_days < 7 ? "font-semibold text-danger" : r.coverage_days < 15 ? "text-warning" : "text-text-secondary")}>
            {r.coverage_days >= 365 ? "+1 año" : `${Math.round(r.coverage_days)} días`}
          </span>
        ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <Badge variant={STATUS_VARIANT[r.status]} dot>{STATUS_LABEL(r.status)}</Badge>
          {r.lost_sales_30d > 0 && (
            <span title={`${r.lost_sales_30d} veces te pidieron este producto y no había (últimos 30 días)`} className="text-danger">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
      ),
    },
    { key: "last_movement", header: "Última entrada o salida", cell: (r) => <span className="text-xs text-text-secondary">{relativeDate(r.last_movement_at)}</span> },
  ];
  // With a category filter, only the columns that belong to that product type (or any of
  // its subtypes) are shown — so "Talla" disappears when you look at Electro.
  const filterScope = categoryId ? new Set([...ancestorIds(cats, categoryId), ...descendantIds(cats, categoryId)]) : null;
  const customForView = columns.visibleFields.filter(
    (f) => !filterScope || isGlobalField(f) || f.category_ids.some((id) => filterScope.has(id)),
  );
  const visibleColumns: Col[] = [
    ...tableColumns.filter((c) => c.key === "product" || show(c.key)),
    ...customForView.map((f) => ({
      key: `custom:${f.key}`,
      header: f.label,
      align: f.field_type === "number" || f.field_type === "currency" ? ("right" as const) : undefined,
      cell: (r: Row) =>
        fieldAppliesTo(f, r.category_id, cats) ? (
          <span className="text-text-secondary">{formatCustomValue(f, r.custom_attributes?.[f.key])}</span>
        ) : (
          <span title="No aplica a este tipo de producto" className="text-text-muted/40">·</span>
        ),
    })),
  ];

  const counts = totals?.status_counts;
  const chips: { id: StockStatus | "all"; label: string; count?: number }[] = [
    { id: "all", label: "Todos", count: items.length },
    { id: "sin_stock", label: "Sin stock", count: counts?.sin_stock },
    { id: "critico", label: "Por acabarse", count: counts?.critico },
    { id: "reordenar", label: "Hay que comprar", count: counts?.reordenar },
    { id: "ok", label: "Bien", count: counts?.ok },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Inventario"
        description="Mira cuánto te queda de cada producto y qué se está acabando."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MoreMenu
              items={[
                { label: "Corregir stock", hint: "Si contaste y no cuadra", icon: ClipboardCheck, onClick: () => setAdjustOpen(true), disabled: !companyId || items.length === 0 },
                { label: "Importar Excel", hint: "Carga muchos productos de golpe", icon: Upload, onClick: () => setImportOpen(true), disabled: !companyId },
                { label: "Columnas", hint: "Elige qué ver y crea columnas propias", icon: Columns3, onClick: () => setColumnsOpen(true), disabled: !companyId },
              ]}
            />
            <Button onClick={() => setFormOpen(true)} disabled={!companyId}>
              <PackagePlus className="h-4 w-4" /> Nuevo producto
            </Button>
          </div>
        }
      />

      {flash && (
        <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          {flash}
          <button className="text-xs font-semibold hover:underline" onClick={() => setFlash(null)}>Cerrar</button>
        </div>
      )}

      <div className={cn("grid grid-cols-2 gap-4", expert ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        <SummaryTile icon={PackageX} tone="danger" label="Se acabaron" value={counts ? String(counts.sin_stock) : "—"} sub="Productos en cero. Toca para verlos" onClick={() => setStatus("sin_stock")} />
        <SummaryTile icon={AlertTriangle} tone="warning" label="Hay que comprar" value={counts ? String(counts.reordenar + counts.critico) : "—"} sub={counts ? `${counts.critico} están por acabarse` : undefined} onClick={() => setStatus("reordenar")} />
        <SummaryTile icon={Wallet} label="Lo que tienes en tienda" value={totals ? soles(totals.inventory_value_cost) : "—"} sub={totals ? `${totals.units_on_hand.toLocaleString("es-PE")} unidades, a lo que te costaron` : undefined} />
        {expert && (
          <SummaryTile icon={TrendingUp} label="Valor a precio de venta" value={totals ? soles(totals.inventory_value_retail) : "—"} sub={totals ? `Ganancia posible ${soles(totals.potential_margin)}` : undefined} />
        )}
      </div>
      {counts && counts.sin_stock + counts.reordenar + counts.critico > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-text-primary">
          <span>Tienes {counts.sin_stock + counts.reordenar + counts.critico} productos que necesitan compra.</span>
          <button className="text-sm font-semibold text-primary hover:underline" onClick={() => router.push("/forecasting?vista=comprar")}>
            Ver qué comprar →
          </button>
        </div>
      )}

      <DataState
        loading={overview.loading && !overview.data}
        error={overview.error}
        onRetry={reload}
        empty={items.length === 0}
        emptyState={
          <EmptyState
            icon={Boxes}
            title="Aún no tienes productos"
            description="Importa tu Excel o crea el primero. Si usas Excel, nosotros reconocemos las columnas por ti."
            action={{ label: "Importar mi Excel", onClick: () => setImportOpen(true) }}
            hint="¿Pocos productos? Usa “Nuevo producto” y agrégalos uno por uno."
          />
        }
      >
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input className={inputClass(false, "pl-10")} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca por nombre, código o categoría" />
            </div>
            <div className="w-full lg:w-64">
              <Select value={categoryId} options={catOptions} onChange={setCategoryId} searchable placeholder="Todas las categorías" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border-soft px-5 py-3">
            {chips.map((c) => (
              <button
                key={c.id}
                onClick={() => setStatus(c.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  status === c.id ? "border-primary/30 bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:bg-surface-soft",
                )}
              >
                {c.label}
                {c.count != null && <span className="tabular-nums opacity-70">{c.count}</span>}
              </button>
            ))}
            <span className="ml-auto text-xs text-text-muted">{filtered.length} de {items.length} productos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-max min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60">
                  {visibleColumns.map((c) => (
                    <th key={c.key} className={cn("whitespace-nowrap px-3 py-3 first:pl-5", c.align === "right" && "text-right")}>
                      <button
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "flex w-full min-w-0 items-center gap-0.5 text-[10.5px] font-semibold uppercase leading-tight tracking-[0.02em] transition-colors hover:text-text-primary",
                          c.align === "right" ? "justify-end" : "justify-start",
                          sort.key === c.key ? "text-text-primary" : "text-text-muted",
                        )}
                      >
                        <span className="whitespace-nowrap text-left">{c.header}</span>
                        <span className="mt-px shrink-0">
                          {sort.key === c.key ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => router.push(`/inventory/${r.id}`)} className="cursor-pointer transition-colors hover:bg-primary-softer/60">
                    {visibleColumns.map((c) => (
                      <td key={c.key} className={cn("whitespace-nowrap px-3 py-3 text-sm text-text-primary first:pl-5", c.align === "right" && "text-right")}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length} className="px-6 py-14 text-center text-sm text-text-muted">
                      Ningún producto coincide con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </DataState>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        companyId={companyId}
        product={null}
        categories={cats}
        fields={columns.fields}
        onSaved={(p) => {
          reload();
          if (p) setFlash(`Listo, guardamos “${p.name}”.`);
        }}
      />
      <ProductImportWizard open={importOpen} onClose={() => setImportOpen(false)} companyId={companyId} fields={columns.fields} onFinished={() => { reload(); columns.reloadFields(); }} />
      <ColumnsManager
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        companyId={companyId}
        entity="product"
        entityLabel="el inventario"
        builtinColumns={expert ? BUILTINS : BUILTINS.filter((b) => !EXPERT_ONLY.has(b.key))}
        hiddenBuiltins={columns.hiddenBuiltins}
        onHiddenBuiltinsChange={columns.setHiddenBuiltins}
        fields={columns.fields}
        onFieldsChanged={columns.reloadFields}
        categories={cats}
        onCategoriesChanged={categories.reload}
      />
      <StockAdjustmentModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        companyId={companyId}
        products={items}
        onDone={(res) => {
          overview.reload();
          const name = items.find((i) => i.id === res.product_id)?.name ?? "Producto";
          setFlash(res.delta === 0 ? `${name}: el stock ya estaba en ${res.new_stock}.` : `${name}: ahora tienes ${res.new_stock} (antes ${res.previous_stock}).`);
        }}
      />
    </div>
  );
}

function STATUS_LABEL(s: StockStatus) {
  return STOCK_STATUS_LABEL[s];
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "danger" | "warning";
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn("p-5", onClick && "cursor-pointer")}
      interactive={!!onClick}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">{label}</p>
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
            tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight text-text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>}
    </Card>
  );
}
