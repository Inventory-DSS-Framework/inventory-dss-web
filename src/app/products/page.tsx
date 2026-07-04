"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { Package, CheckCircle, XCircle, PackagePlus, Pencil } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { categoriesApi, productsApi } from "@/lib/api";
import type { ProductDTO } from "@/types/api";

export default function ProductsPage() {
  const companyId = useCompanyId();

  const products = useApi(
    () => (companyId ? productsApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  const categories = useApi(
    () => (companyId ? categoriesApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (product: ProductDTO) => {
    setEditing(product);
    setFormOpen(true);
  };

  const categoryName = useMemo(() => {
    const map = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [categories.data]);

  const items = products.data ?? [];
  const active = items.filter((p) => p.is_active).length;
  const inactive = items.length - active;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Catálogo de productos y SKUs monitoreados por el modelo."
        action={
          <Button onClick={openCreate} disabled={!companyId}>
            <PackagePlus className="w-4 h-4" />
            Nuevo producto
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Total de productos" value={String(items.length)} icon={Package} accent="primary" />
        <StatCard title="Activos" value={String(active)} icon={CheckCircle} accent="success" />
        <StatCard title="Inactivos" value={String(inactive)} icon={XCircle} accent="danger" />
      </div>

      <DataState
        loading={products.loading}
        error={products.error}
        empty={items.length === 0}
        onRetry={products.reload}
        emptyState={
          <EmptyState
            icon={Package}
            title="Empieza tu catálogo de productos"
            description="Registra tus productos con su SKU, costo y precio. Es el paso 1 del flujo: las ventas que subas se cruzan contra este catálogo."
            action={{ label: "Nuevo producto", onClick: openCreate }}
          />
        }
      >
        <Table
          title="Listado de productos"
          data={items}
          keyExtractor={(p) => p.id}
          columns={[
            { header: "SKU", accessor: (p) => <span className="font-mono text-text-secondary">{p.sku}</span> },
            { header: "Nombre", accessor: (p) => <span className="font-medium text-text-primary">{p.name}</span> },
            { header: "Categoría", accessor: (p) => <Badge variant="default">{categoryName(p.category_id)}</Badge> },
            { header: "Costo", accessor: (p) => `S/ ${Number(p.unit_cost).toFixed(2)}` },
            { header: "Precio", accessor: (p) => <span className="font-semibold">S/ {Number(p.unit_price).toFixed(2)}</span> },
            { header: "Punto reorden", accessor: (p) => <span className="text-text-secondary">{p.reorder_point}</span> },
            {
              header: "Estado",
              accessor: (p) => (
                <Badge variant={p.is_active ? "success" : "danger"} dot>
                  {p.is_active ? "Activo" : "Inactivo"}
                </Badge>
              ),
            },
            {
              header: "",
              accessor: (p) => (
                <button
                  onClick={() => openEdit(p)}
                  className="inline-flex items-center gap-1 text-primary hover:text-primary-hover text-sm font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
              ),
            },
          ]}
        />
      </DataState>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        companyId={companyId}
        product={editing}
        categories={categories.data ?? []}
        onSaved={products.reload}
      />
    </div>
  );
}
