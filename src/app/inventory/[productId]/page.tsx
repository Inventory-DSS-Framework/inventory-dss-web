"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, ArrowLeft, BrainCircuit, ChevronRight, ClipboardCheck, Clock, Coins, Loader2, Pencil,
  Receipt, ScanBarcode, ShoppingCart, SlidersHorizontal, Truck, TrendingUp, PackageX, Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { ProductImagePicker } from "@/components/products/ProductImagePicker";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { CustomFieldInput, formatCustomValue } from "@/components/custom-fields/CustomFieldInput";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useBrandColors } from "@/hooks/useBrandColors";
import { useColumnConfig } from "@/hooks/useColumnConfig";
import { categoriesApi } from "@/lib/api";
import { catalogApi } from "@/lib/apis/inventory";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { STOCK_STATUS_LABEL, type StockStatus, type TimelineEvent, type TimelineKind } from "@/types/inventory";
import type { CustomAttributes } from "@/types/custom-fields";
import { fieldsForCategory } from "@/lib/custom-fields/scope";
import { useExpertMode } from "@/hooks/useExpertMode";
import { ProductAdvice } from "@/components/ftgm/ProductAdvice";

type Filter = "all" | TimelineKind;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "sale", label: "Ventas" },
  { id: "restock", label: "Compras" },
  { id: "adjustment", label: "Correcciones" },
  { id: "lost_sale", label: "No había stock" },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function statusOf(onHand: number, safety: number, reorder: number): StockStatus {
  if (onHand <= 0) return "sin_stock";
  if (onHand <= safety) return "critico";
  if (onHand <= reorder) return "reordenar";
  return "ok";
}
const STATUS_VARIANT: Record<StockStatus, "danger" | "warning" | "success"> = {
  sin_stock: "danger", critico: "danger", reordenar: "warning", ok: "success",
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const companyId = useCompanyId();
  const colors = useBrandColors();
  const data = useApi(() => (companyId ? catalogApi.timeline(companyId, productId) : Promise.resolve(null)), [companyId, productId]);
  const categories = useApi(() => (companyId ? categoriesApi.list(companyId) : Promise.resolve([])), [companyId]);
  const columns = useColumnConfig(companyId, "product");
  const [expert] = useExpertMode();

  const [filter, setFilter] = useState<Filter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [attrs, setAttrs] = useState<CustomAttributes | null>(null);
  const [savingAttrs, setSavingAttrs] = useState(false);
  const [attrsError, setAttrsError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(40);

  const t = data.data;
  const product = t?.product;
  const stats = t?.stats;

  const events = useMemo(() => (t?.events ?? []).filter((e) => filter === "all" || e.kind === filter), [t, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: t?.events.length ?? 0 };
    for (const e of t?.events ?? []) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [t]);

  const stockSeries = useMemo(() => (t?.stock_series ?? []).map((p) => ({ ...p, label: fmtDay(p.date) })), [t]);
  const restockDots = stockSeries.filter((p) => p.inbound > 0);
  const monthly = useMemo(
    () => (t?.monthly_sales ?? []).map((m) => ({ ...m, label: `${MONTHS[Number(m.month.slice(5)) - 1]} ${m.month.slice(2, 4)}`, revenue: Number(m.revenue) })),
    [t],
  );

  if (!product || !stats) {
    return (
      <div className="mx-auto max-w-[1300px] space-y-6">
        <BackLink />
        <DataState loading={data.loading} error={data.error} onRetry={data.reload}>
          <div />
        </DataState>
      </div>
    );
  }

  const status = statusOf(stats.stock_on_hand, product.safety_stock, product.reorder_point);
  const price = Number(product.unit_price);
  const avgCost = Number(product.unit_cost);
  const margin = price > 0 ? ((price - avgCost) / price) * 100 : null;
  const currentAttrs = attrs ?? product.custom_attributes ?? {};
  const attrsDirty = attrs !== null;
  // Only the columns of this product's type (plus the ones for every product).
  const productFields = fieldsForCategory(columns.fields, product.category_id, categories.data ?? []);

  const saveImage = async (value: string | null) => {
    if (!companyId) return;
    await catalogApi.update(companyId, product.id, { image_url: value });
    data.reload();
  };

  const saveAttrs = async () => {
    if (!companyId || !attrs) return;
    setSavingAttrs(true);
    setAttrsError(null);
    try {
      await catalogApi.update(companyId, product.id, { custom_attributes: attrs });
      setAttrs(null);
      data.reload();
    } catch (err) {
      setAttrsError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSavingAttrs(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <BackLink />

      {/* Hero */}
      <Card className="p-6 lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr_auto]">
          <ProductImagePicker value={product.image_url ?? null} onChange={saveImage} className="w-full max-w-[200px]" />
          <div className="min-w-0 space-y-3">
            {t.category_path.length > 0 && (
              <nav className="flex flex-wrap items-center gap-1 text-xs font-medium text-text-muted" aria-label="Categoría">
                {t.category_path.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    <span className={i === t.category_path.length - 1 ? "text-primary" : undefined}>{c}</span>
                  </span>
                ))}
              </nav>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-text-primary">{product.name}</h1>
              <Badge variant={STATUS_VARIANT[status]} dot>{STOCK_STATUS_LABEL[status]}</Badge>
              {!product.is_active && <Badge>Inactivo</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {expert && <span className="rounded-lg border border-border bg-surface-soft px-2 py-1 font-mono text-text-secondary" title="Código">{product.sku}</span>}
              {expert && product.barcode && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-soft px-2 py-1 font-mono text-text-secondary">
                  <ScanBarcode className="h-3.5 w-3.5" /> {product.barcode}
                </span>
              )}
              <span className="text-text-muted">Unidad: {product.unit_of_measure === "unit" ? "unidad" : product.unit_of_measure}</span>
            </div>
            {product.description && <p className="max-w-2xl text-sm text-text-secondary">{product.description}</p>}
            <div className={cn("grid grid-cols-2 gap-3 pt-1", expert ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
              <HeroFigure
                label="Te quedan"
                value={`${stats.stock_on_hand.toLocaleString("es-PE")} u.`}
                tone={status === "ok" ? undefined : status === "reordenar" ? "warning" : "danger"}
                sub={`Mínimo ${product.safety_stock} · comprar al llegar a ${product.reorder_point}`}
                strong
              />
              <HeroFigure label="Precio de venta" value={soles(price)} strong />
              <HeroFigure label="Te cuesta (promedio)" value={soles(avgCost)} />
              {expert && <HeroFigure label="Último costo" value={product.last_cost != null ? soles(product.last_cost) : "—"} />}
              <HeroFigure label="Ganancia" value={margin == null ? "—" : `${margin.toFixed(1)}%`} tone={margin != null && margin < 0 ? "danger" : "success"} />
            </div>
          </div>
          <div className="flex flex-row flex-wrap gap-2 lg:flex-col lg:items-stretch">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
              <ClipboardCheck className="h-4 w-4" /> Corregir stock
            </Button>
            <Button variant="violet" onClick={() => router.push(`/forecasting?product=${product.id}`)}>
              <BrainCircuit className="h-4 w-4" /> {expert ? "Pronosticar con FTGM" : "¿Cuánto venderé?"}
            </Button>
          </div>
        </div>
      </Card>

      <ProductAdvice companyId={companyId} productId={productId} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={ShoppingCart} label="Vendidos 30 días" value={stats.units_sold_30d.toLocaleString("es-PE")} sub={`${stats.units_sold_90d} en 90 días · ${stats.units_sold_365d} en el año`} />
        <Kpi icon={Coins} label="Vendido en 12 meses" value={soles(stats.revenue_365d)} sub={stats.avg_price_365d != null ? `Precio promedio ${soles(stats.avg_price_365d)}${expert && stats.gross_margin_pct != null ? ` · margen ${stats.gross_margin_pct}%` : ""}` : "Sin ventas en el año"} />
        <Kpi
          icon={Clock}
          label="Te alcanza para"
          value={stats.coverage_days == null ? "—" : stats.coverage_days >= 365 ? "+1 año" : `${Math.round(stats.coverage_days)} días`}
          sub={stats.coverage_days == null ? "Sin ventas en 30 días" : "Si sigues vendiendo como ahora"}
          tone={stats.coverage_days != null && stats.coverage_days < 7 ? "danger" : stats.coverage_days != null && stats.coverage_days < 15 ? "warning" : undefined}
        />
        <Kpi
          icon={PackageX}
          label="Ventas perdidas"
          value={String(stats.lost_sale_attempts)}
          sub={stats.lost_sale_attempts ? `Veces que te pidieron y no había · ${stats.lost_units} u. no vendidas` : "Nunca te faltó stock"}
          tone={stats.lost_sale_attempts > 0 ? "danger" : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          {/* Stock chart */}
          <Card>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-text-primary">Cuánto stock tuviste</h2>
                <p className="text-xs text-text-muted">Últimos 6 meses · los puntos verdes son tus compras</p>
              </div>
              <div className="text-right text-xs text-text-muted">
                {stats.restock_count} compras{stats.last_restock_at ? ` · última ${fmtDay(stats.last_restock_at)}` : ""}
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockSeries} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="stockFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.primary} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11, fill: colors.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<StockTooltip />} />
                  <Area type="stepAfter" dataKey="stock" stroke={colors.primary} strokeWidth={2} fill="url(#stockFill)" />
                  {restockDots.map((p) => (
                    <ReferenceDot key={p.date} x={p.label} y={p.stock} r={4} fill={colors.success} stroke={colors.surface} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Monthly sales */}
          <Card>
            <div className="mb-4">
              <h2 className="font-display text-[15px] font-semibold text-text-primary">Ventas por mes</h2>
              <p className="text-xs text-text-muted">Unidades vendidas en los últimos 18 meses</p>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis tick={{ fontSize: 11, fill: colors.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={<MonthTooltip />} />
                  <Bar dataKey="units" fill={colors.primary} radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Custom attributes */}
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-text-primary">Columnas propias</h2>
                <p className="text-xs text-text-muted">Datos extra que tú agregaste (ej. talla, sabor)</p>
              </div>
              {attrsDirty && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setAttrs(null)} disabled={savingAttrs}>Descartar</Button>
                  <Button size="sm" onClick={saveAttrs} loading={savingAttrs}>
                    <Check className="h-3.5 w-3.5" /> Guardar
                  </Button>
                </div>
              )}
            </div>
            {attrsError && <p className="mb-3 text-xs text-danger">{attrsError}</p>}
            {productFields.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-text-secondary">
                <SlidersHorizontal className="h-5 w-5 text-text-muted" />
                <span>
                  Aún no tienes columnas propias. Créalas desde <Link href="/inventory" className="font-semibold text-primary hover:underline">Inventario › Columnas</Link> (ej. “Sabor”, “Talla”, “Proveedor habitual”).
                </span>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {productFields.map((f) => (
                  <div key={f.id}>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">{f.label}</span>
                    <CustomFieldInput
                      field={f}
                      value={currentAttrs[f.key]}
                      onChange={(v) => setAttrs({ ...currentAttrs, [f.key]: v })}
                    />
                    {!attrsDirty && currentAttrs[f.key] != null && f.field_type === "url" && (
                      <span className="mt-1 block truncate text-[11px] text-text-muted">{formatCustomValue(f, currentAttrs[f.key])}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Timeline */}
        <Card className="h-fit p-0">
          <div className="border-b border-border px-6 py-5">
            <h2 className="font-display text-[15px] font-semibold text-text-primary">Historia del producto</h2>
            <p className="text-xs text-text-muted">Cada venta, compra y corrección, de lo más reciente a lo más antiguo</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setFilter(f.id); setVisibleCount(40); }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    filter === f.id ? "border-primary/30 bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:bg-surface-soft",
                  )}
                >
                  {f.label}
                  <span className="tabular-nums opacity-70">{counts[f.id] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[1100px] overflow-y-auto px-6 py-5">
            {events.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">Todavía no hay nada aquí.</p>
            ) : (
              <ol className="relative space-y-1">
                <span className="absolute bottom-3 left-[17px] top-3 w-px bg-border" aria-hidden="true" />
                {events.slice(0, visibleCount).map((e) => (
                  <TimelineItem key={`${e.kind}-${e.id}`} event={e} />
                ))}
              </ol>
            )}
            {events.length > visibleCount && (
              <div className="pt-3 text-center">
                <Button size="sm" variant="ghost" onClick={() => setVisibleCount((n) => n + 60)}>Ver más ({events.length - visibleCount})</Button>
              </div>
            )}
            {t.events_truncated && events.length <= visibleCount && (
              <p className="pt-3 text-center text-[11px] text-text-muted">Mostramos solo lo más reciente de cada tipo.</p>
            )}
          </div>
        </Card>
      </div>

      <ProductFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        companyId={companyId}
        product={product}
        categories={categories.data ?? []}
        fields={columns.fields}
        onSaved={() => data.reload()}
        onDeleted={() => router.push("/inventory")}
      />
      <StockAdjustmentModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        companyId={companyId}
        productId={product.id}
        products={[{ id: product.id, name: product.name, sku: product.sku, stock_on_hand: stats.stock_on_hand, image_url: product.image_url }]}
        onDone={() => data.reload()}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary">
      <ArrowLeft className="h-4 w-4" /> Inventario
    </Link>
  );
}

function HeroFigure({ label, value, sub, strong, tone }: { label: string; value: string; sub?: string; strong?: boolean; tone?: "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface-soft/70 px-3.5 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">{label}</p>
      <p
        className={cn(
          "font-display tabular-nums",
          strong ? "text-lg font-bold" : "text-base font-semibold",
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-text-primary",
        )}
      >
        {value}
      </p>
      {sub && <p className="truncate text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tone?: "warning" | "danger" }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">{label}</p>
        <span className={cn("grid h-8 w-8 place-items-center rounded-xl", tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary")}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-2 font-display text-2xl font-bold tabular-nums tracking-tight", tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text-primary")}>{value}</p>
      <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StockTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { label: string; stock: number; inbound: number; outbound: number };
  return (
    <div className="glass min-w-[160px] rounded-2xl px-4 py-3 text-xs shadow-soft-xl">
      <p className="mb-1.5 font-medium uppercase tracking-[0.08em] text-text-muted">{p.label}</p>
      <p className="flex justify-between gap-4"><span className="text-text-secondary">Stock</span><strong className="tabular-nums text-text-primary">{p.stock}</strong></p>
      {p.inbound > 0 && <p className="flex justify-between gap-4"><span className="text-text-secondary">Entradas</span><strong className="tabular-nums text-success">+{p.inbound}</strong></p>}
      {p.outbound > 0 && <p className="flex justify-between gap-4"><span className="text-text-secondary">Salidas</span><strong className="tabular-nums text-danger">−{p.outbound}</strong></p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MonthTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { label: string; units: number; revenue: number };
  return (
    <div className="glass min-w-[150px] rounded-2xl px-4 py-3 text-xs shadow-soft-xl">
      <p className="mb-1.5 font-medium uppercase tracking-[0.08em] text-text-muted">{p.label}</p>
      <p className="flex justify-between gap-4"><span className="text-text-secondary">Unidades</span><strong className="tabular-nums text-text-primary">{p.units}</strong></p>
      <p className="flex justify-between gap-4"><span className="text-text-secondary">Ingresos</span><strong className="tabular-nums text-text-primary">{soles(p.revenue)}</strong></p>
    </div>
  );
}

const KIND_STYLE: Record<TimelineKind, { icon: React.ComponentType<{ className?: string }>; ring: string }> = {
  sale: { icon: Receipt, ring: "bg-primary-soft text-primary" },
  restock: { icon: Truck, ring: "bg-success-soft text-success" },
  adjustment: { icon: SlidersHorizontal, ring: "bg-warning-soft text-warning" },
  lost_sale: { icon: AlertTriangle, ring: "bg-danger-soft text-danger" },
};

function TimelineItem({ event: e }: { event: TimelineEvent }) {
  const style = KIND_STYLE[e.kind];
  const Icon = style.icon;
  let href: string | null = null;
  let title: React.ReactNode;
  let detail: React.ReactNode = null;
  let amount: React.ReactNode = null;

  if (e.kind === "sale") {
    href = e.order_id ? `/sales/${e.order_id}` : "/sales";
    title = e.order_number ? `Venta · Ticket #${e.order_number}` : e.batch_id ? "Venta cargada desde Excel" : "Venta";
    detail = (
      <>
        {e.quantity} u. × {soles(e.unit_price)}
        {e.seller_name && <> · {e.seller_name}</>}
      </>
    );
    amount = <span className="text-text-primary">{soles(e.total)}</span>;
  } else if (e.kind === "restock") {
    href = e.supplier_id ? `/suppliers/${e.supplier_id}` : null;
    title = `Compra · ${e.supplier_name ?? "Proveedor"}`;
    detail = (
      <>
        {e.quantity} u. × {soles(e.unit_cost)}
        {e.document_number && <> · Comprobante {e.document_number}</>}
      </>
    );
    amount = <span className="text-success">+{e.quantity}</span>;
  } else if (e.kind === "adjustment") {
    const signed = e.signed_quantity ?? e.quantity;
    title = e.reason ?? "Entrada o salida";
    detail =
      e.reference_type === "import" ? "Carga desde Excel" :
      e.reference_type === "initial" ? "Stock inicial del producto" :
      e.reference_type === "sale_void" ? "Venta anulada" :
      e.reference_type === "adjustment" ? "Corrección manual" : e.movement_type === "inbound" ? "Entrada" : e.movement_type === "outbound" ? "Salida" : "Ajuste";
    amount = <span className={signed < 0 ? "text-danger" : "text-success"}>{signed > 0 ? "+" : ""}{signed}</span>;
  } else {
    title = "No había stock · venta perdida";
    detail = (
      <>
        Te pidieron {e.requested_quantity}, había {e.available_quantity}
        {e.seller_name && <> · {e.seller_name}</>}
      </>
    );
    amount = <span className="text-danger">−{e.quantity}</span>;
  }

  const body = (
    <div className={cn("relative flex gap-3 rounded-2xl px-2 py-2.5 transition-colors", href && "hover:bg-surface-soft")}>
      <span className={cn("relative z-10 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-xl ring-4 ring-surface", style.ring)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-semibold text-text-primary">{title}</p>
          <span className="shrink-0 font-display text-sm font-semibold tabular-nums">{amount}</span>
        </div>
        <p className="truncate text-xs text-text-secondary">{detail}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
          {fmtDateTime(e.occurred_at)}
          {href && <ChevronRight className="h-3 w-3" />}
        </p>
      </div>
    </div>
  );
  return <li>{href ? <Link href={href}>{body}</Link> : body}</li>;
}

// Kept for tree-shaking friendliness of unused icon imports in some builds.
void TrendingUp;
void Loader2;
