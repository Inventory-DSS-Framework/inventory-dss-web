"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, History, Layers, Lock, Package, Search, Tags, Truck, UserRound, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { inputClass } from "@/lib/ui";
import type { CategoryDTO, ProductDTO, SupplierDTO } from "@/types/api";
import type { CompanyUserLite, ForecastScope, ScopeType } from "@/types/ftgm";

const OPTIONS: { type: ScopeType; title: string; hint: string; icon: typeof History; premium: boolean }[] = [
  { type: "recent_sales", title: "Productos vendidos recientemente", hint: "Lo que se movió en los últimos meses.", icon: History, premium: true },
  { type: "supplier", title: "Por proveedor", hint: "Todo lo que le compras a un proveedor.", icon: Truck, premium: true },
  { type: "seller", title: "Por vendedor", hint: "Lo que vende una persona de tu equipo.", icon: UserRound, premium: true },
  { type: "category", title: "Por categoría", hint: "Incluye sus subcategorías.", icon: Tags, premium: true },
  { type: "products", title: "Productos específicos", hint: "Elige uno o varios productos.", icon: Package, premium: false },
  { type: "all", title: "Todo el catálogo", hint: "Cada producto activo con ventas.", icon: Layers, premium: true },
];

export function ScopePicker({
  scope,
  onChange,
  isPremium,
  products,
  suppliers,
  categories,
  users,
}: {
  scope: ForecastScope;
  onChange: (scope: ForecastScope) => void;
  isPremium: boolean;
  products: ProductDTO[];
  suppliers: SupplierDTO[];
  categories: CategoryDTO[];
  users: CompanyUserLite[];
}) {
  const [customMonths, setCustomMonths] = useState("");

  const categoryOptions = useMemo(() => {
    const children = new Map<string | null, CategoryDTO[]>();
    for (const c of categories) children.set(c.parent_id, [...(children.get(c.parent_id) ?? []), c]);
    const out: { value: string; label: string; depth: number }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const c of (children.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
        out.push({ value: c.id, label: c.name, depth });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [categories]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {OPTIONS.map((o) => {
          const locked = o.premium && !isPremium;
          const active = scope.type === o.type;
          const Icon = o.icon;
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl transition-colors",
                    active ? "bg-accent-violet text-surface" : "bg-accent-violet-soft text-accent-violet",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {locked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary">
                    <Lock className="h-3 w-3" /> Disponible en Premium
                  </span>
                ) : active ? (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-violet text-surface">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-text-primary">{o.title}</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {o.type === "products" && !isPremium ? "Plan gratuito: 1 producto." : o.hint}
              </p>
            </>
          );
          const cls = cn(
            "block rounded-2xl border p-4 text-left transition-all duration-200",
            active
              ? "border-accent-violet/50 bg-accent-violet-soft/35 shadow-soft"
              : "border-border bg-surface hover:-translate-y-0.5 hover:border-accent-violet/30 hover:shadow-soft",
            locked && "opacity-75",
          );
          return locked ? (
            <Link key={o.type} href="/premium" className={cls}>
              {body}
            </Link>
          ) : (
            <button
              key={o.type}
              type="button"
              className={cls}
              onClick={() =>
                onChange(
                  o.type === "recent_sales"
                    ? { type: o.type, months: scope.months ?? 12 }
                    : o.type === "products"
                      ? { type: o.type, product_ids: (scope.product_ids ?? []).slice(0, isPremium ? undefined : 1) }
                      : { type: o.type },
                )
              }
            >
              {body}
            </button>
          );
        })}
      </div>

      {/* Parameters for the chosen scope */}
      {scope.type === "recent_sales" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-soft bg-surface-soft/60 p-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-text-muted">Últimos</span>
          {[3, 6, 12, 24].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ type: "recent_sales", months: m })}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                scope.months === m ? "bg-accent-violet text-surface" : "bg-surface text-text-secondary hover:text-text-primary",
              )}
            >
              {m} meses
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={120}
            placeholder="Otro"
            value={customMonths}
            onChange={(e) => {
              setCustomMonths(e.target.value);
              const n = Number(e.target.value);
              if (n >= 1 && n <= 120) onChange({ type: "recent_sales", months: n });
            }}
            className={inputClass(false, "w-24 py-1.5")}
          />
        </div>
      )}
      {scope.type === "supplier" && (
        <Select
          value={scope.supplier_id ?? ""}
          onChange={(v) => onChange({ type: "supplier", supplier_id: v })}
          placeholder="Elige un proveedor"
          options={suppliers.map((s) => ({ value: s.id, label: s.business_name, description: `RUC ${s.ruc}` }))}
          emptyText="Aún no registras proveedores"
        />
      )}
      {scope.type === "seller" && (
        <Select
          value={scope.seller_id ?? ""}
          onChange={(v) => onChange({ type: "seller", seller_id: v })}
          placeholder="Elige a una persona de tu equipo"
          options={users.map((u) => ({
            value: u.id,
            label: u.full_name || u.email || "Usuario",
            description: u.role === "seller" ? "Vendedor" : u.role === "owner" ? "Propietario" : u.role,
          }))}
        />
      )}
      {scope.type === "category" && (
        <Select
          value={scope.category_id ?? ""}
          onChange={(v) => onChange({ type: "category", category_id: v })}
          placeholder="Elige una categoría"
          options={categoryOptions}
          emptyText="Aún no tienes categorías"
        />
      )}
      {scope.type === "products" && (
        <ProductMultiSelect
          products={products}
          value={scope.product_ids ?? []}
          max={isPremium ? undefined : 1}
          onChange={(ids) => onChange({ type: "products", product_ids: ids })}
        />
      )}
    </div>
  );
}

function ProductMultiSelect({
  products,
  value,
  max,
  onChange,
}: {
  products: ProductDTO[];
  value: string[];
  max?: number;
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const selected = new Set(value);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const filtered = products
    .filter((p) => p.is_active && (!q.trim() || norm(`${p.name} ${p.sku}`).includes(norm(q.trim()))))
    .slice(0, 60);
  const byId = new Map(products.map((p) => [p.id, p]));

  const toggle = (id: string) => {
    if (selected.has(id)) return onChange(value.filter((v) => v !== id));
    if (max === 1) return onChange([id]);
    if (max && value.length >= max) return;
    onChange([...value, id]);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border-soft p-3">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-accent-violet-soft px-2.5 py-1 text-xs font-medium text-accent-violet">
              {byId.get(id)?.name ?? id.slice(0, 8)}
              <button type="button" onClick={() => toggle(id)} aria-label="Quitar">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-b border-border-soft px-3 py-2">
        <Search className="h-4 w-4 text-text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o SKU…"
          className="w-full bg-transparent py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        {max === 1 && <span className="shrink-0 text-[11px] text-text-muted">Máx. 1 en plan gratuito</span>}
      </div>
      <div className="max-h-64 overflow-y-auto p-1.5">
        {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-text-muted">Sin resultados</p>}
        {filtered.map((p) => {
          const on = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                on ? "bg-accent-violet-soft/60" : "hover:bg-surface-soft",
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded border",
                  on ? "border-accent-violet bg-accent-violet text-surface" : "border-border",
                )}
              >
                {on && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-primary">{p.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-text-muted">{p.sku}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function scopeIsComplete(scope: ForecastScope): boolean {
  switch (scope.type) {
    case "recent_sales":
      return !!scope.months && scope.months > 0;
    case "supplier":
      return !!scope.supplier_id;
    case "seller":
      return !!scope.seller_id;
    case "category":
      return !!scope.category_id;
    case "products":
      return (scope.product_ids?.length ?? 0) > 0;
    default:
      return true;
  }
}
