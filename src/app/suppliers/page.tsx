"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle, Columns3, FileSpreadsheet, History, PackagePlus, Pencil, Plus, Search, Truck, UserPlus, Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { SupplierImportWizard } from "@/components/suppliers/SupplierImportWizard";
import { ColumnsManager, type BuiltinColumn } from "@/components/custom-fields/ColumnsManager";
import { formatCustomValue } from "@/components/custom-fields/CustomFieldInput";
import { fmtDate, num } from "@/components/purchases/format";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useColumnConfig } from "@/hooks/useColumnConfig";
import { suppliersApi } from "@/lib/api";
import { inputClass, soles } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { SupplierDTO } from "@/types/api";
import { MoreMenu } from "@/components/simple/MoreMenu";
import { useExpertMode } from "@/hooks/useExpertMode";

const BUILTINS: BuiltinColumn[] = [
  { key: "business_name", label: "Proveedor", locked: true },
  { key: "ruc", label: "RUC" },
  { key: "contact_name", label: "Contacto" },
  { key: "phone", label: "Teléfono" },
  { key: "email", label: "Correo" },
  { key: "address", label: "Dirección" },
  { key: "status", label: "Estado" },
  { key: "total_purchased", label: "Total comprado" },
  { key: "last_purchase_date", label: "Última compra" },
];

const RIGHT_ALIGNED = new Set(["total_purchased"]);
/** Columns only shown in "Modo experto". */
const EXPERT_ONLY = new Set(["ruc", "email", "address", "status"]);

type StatusFilter = "all" | "active" | "inactive";

function builtinCell(key: string, s: SupplierDTO) {
  const muted = (v: string) => (v ? <span className="text-text-secondary">{v}</span> : <span className="text-text-muted">—</span>);
  switch (key) {
    case "business_name":
      return <span className="font-medium text-text-primary">{s.business_name}</span>;
    case "ruc":
      return <span className="font-mono text-[13px] text-text-secondary">{s.ruc}</span>;
    case "contact_name":
      return <span className="break-words">{muted(s.contact_name)}</span>;
    case "phone":
      return muted(s.phone);
    case "email":
      return <span className="break-words">{muted(s.email)}</span>;
    case "address":
      return <span className="block max-w-[240px] truncate text-text-secondary" title={s.address}>{s.address || "—"}</span>;
    case "status":
      return <Badge variant={s.is_active ? "success" : "default"} dot>{s.is_active ? "Activo" : "Inactivo"}</Badge>;
    case "total_purchased":
      return num(s.total_purchased) > 0 ? <span className="font-semibold tabular-nums">{soles(s.total_purchased)}</span> : <span className="text-text-muted">—</span>;
    case "last_purchase_date":
      return muted(s.last_purchase_date ? fmtDate(s.last_purchase_date) : "");
    default:
      return null;
  }
}

export default function SuppliersPage() {
  const companyId = useCompanyId();
  const router = useRouter();
  const suppliers = useApi(() => (companyId ? suppliersApi.list(companyId) : Promise.resolve([] as SupplierDTO[])), [companyId]);
  const columns = useColumnConfig(companyId, "supplier");
  const items = useMemo(() => suppliers.data ?? [], [suppliers.data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierDTO | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [expert] = useExpertMode();

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: SupplierDTO) => { setEditing(s); setFormOpen(true); };

  const visibleBuiltins = BUILTINS.filter((c) => c.locked || (columns.isBuiltinVisible(c.key) && (expert || !EXPERT_ONLY.has(c.key))));
  const customCols = columns.visibleFields;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) => {
      if (status === "active" && !s.is_active) return false;
      if (status === "inactive" && s.is_active) return false;
      if (!q) return true;
      const haystack = [s.business_name, s.ruc, s.contact_name, s.phone, s.email, s.address, ...Object.values(s.custom_attributes ?? {}).map((v) => String(v ?? ""))]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, status]);

  const active = items.filter((s) => s.is_active).length;
  const totalPurchased = items.reduce((acc, s) => acc + num(s.total_purchased), 0);
  const withPurchases = items.filter((s) => num(s.total_purchased) > 0).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Proveedores"
        description="A quién le compras tu mercadería, cómo contactarlos y cuánto les has comprado."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <MoreMenu
              items={[
                { label: "Ver mis compras", icon: History, onClick: () => router.push("/purchases") },
                { label: "Importar Excel", hint: "Carga tu lista de proveedores", icon: FileSpreadsheet, onClick: () => setImportOpen(true), disabled: !companyId },
                { label: "Columnas", hint: "Elige qué ver y crea columnas propias", icon: Columns3, onClick: () => setColumnsOpen(true), disabled: !companyId },
              ]}
            />
            <Link href="/purchases/new" className="btn btn-secondary h-10 gap-2 px-4 text-sm">
              <PackagePlus className="h-4 w-4" /> Nueva compra
            </Link>
            <Button onClick={openCreate} disabled={!companyId}>
              <UserPlus className="h-4 w-4" /> Nuevo proveedor
            </Button>
          </div>
        }
      />

      <div className={cn("grid grid-cols-1 gap-6", expert ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <StatCard title="Proveedores" value={String(items.length)} icon={Truck} accent="primary" />
        {expert && <StatCard title="Activos" value={`${active} de ${items.length}`} icon={CheckCircle} accent="success" />}
        <StatCard title={`Total que les compraste · ${withPurchases} con compras`} value={soles(totalPurchased)} icon={Wallet} accent="primary" />
      </div>

      <DataState
        loading={suppliers.loading}
        error={suppliers.error}
        empty={items.length === 0}
        onRetry={suppliers.reload}
        emptyState={
          <EmptyState
            icon={Truck}
            title="Aún no tienes proveedores"
            description="Agrega a quien te vende tu mercadería. Luego anota sus facturas en Compras y tu stock se actualiza solo."
            action={{ label: "Agregar mi primer proveedor", onClick: openCreate }}
            hint={
              <button className="font-semibold text-primary hover:underline" onClick={() => setImportOpen(true)}>
                ¿Ya tienes una lista en Excel? Impórtala
              </button>
            }
          />
        }
      >
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-text-primary">Tus proveedores</h3>
              <span className="text-xs text-text-muted tabular-nums">{filtered.length} de {items.length}</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  className={inputClass(false, "pl-9 py-2")}
                  placeholder="Busca por nombre, contacto o teléfono…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {expert && <div className="sm:w-40">
                <Select<StatusFilter>
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Activos" },
                    { value: "inactive", label: "Inactivos" },
                  ]}
                />
              </div>}
            </div>
          </div>

          <div>
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                {visibleBuiltins.map((c) => (
                  <col key={c.key} style={c.key === "business_name" ? { width: "20%" } : undefined} />
                ))}
                {customCols.map((f) => (
                  <col key={f.id} />
                ))}
                <col style={{ width: 108 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-surface-soft/60">
                  {visibleBuiltins.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted",
                        RIGHT_ALIGNED.has(c.key) && "text-right",
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                  {customCols.map((f) => (
                    <th key={f.id} className="break-words px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-violet">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">
                    {expert && <button
                      type="button"
                      onClick={() => setColumnsOpen(true)}
                      title="Agregar o quitar columnas"
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-softer"
                    >
                      <Plus className="h-3 w-3" /> Columna
                    </button>}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/suppliers/${s.id}`)}
                    className={cn("group cursor-pointer transition-colors duration-150 hover:bg-primary-softer/60", !s.is_active && "opacity-70")}
                  >
                    {visibleBuiltins.map((c) => (
                      <td key={c.key} className={cn("break-words px-5 py-3.5 text-sm text-text-primary", RIGHT_ALIGNED.has(c.key) && "text-right")}>
                        {builtinCell(c.key, s)}
                      </td>
                    ))}
                    {customCols.map((f) => {
                      const v = s.custom_attributes?.[f.key];
                      return (
                        <td key={f.id} className="break-words px-5 py-3.5 text-sm">
                          <span className={v === undefined || v === null || v === "" ? "text-text-muted" : "text-text-secondary"}>
                            {formatCustomValue(f, v)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-primary opacity-70 transition-opacity hover:bg-primary-softer group-hover:opacity-100"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleBuiltins.length + customCols.length + 1} className="px-6 py-14 text-center text-sm text-text-muted">
                      No encontramos proveedores con “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </DataState>

      <SupplierFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        companyId={companyId}
        supplier={editing}
        fields={columns.fields}
        onSaved={() => suppliers.reload()}
      />

      <ColumnsManager
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        companyId={companyId}
        entity="supplier"
        entityLabel="proveedores"
        builtinColumns={expert ? BUILTINS : BUILTINS.filter((b) => !EXPERT_ONLY.has(b.key))}
        hiddenBuiltins={columns.hiddenBuiltins}
        onHiddenBuiltinsChange={columns.setHiddenBuiltins}
        fields={columns.fields}
        onFieldsChanged={columns.reloadFields}
      />

      <SupplierImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        companyId={companyId}
        fields={columns.fields}
        onFinished={() => {
          suppliers.reload();
          columns.reloadFields();
        }}
      />
    </div>
  );
}
