"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PackagePlus, Search, SlidersHorizontal, Package, AlertTriangle, XCircle } from "lucide-react";

export default function ProductsPage() {
  const products = [
    { id: "PRD-001", sku: "SKU-A100", name: "Premium Dog Food 15kg", category: "Alimento", stock: 45, minStock: 20, status: "ok" },
    { id: "PRD-002", sku: "SKU-B200", name: "Cat Litter 10kg", category: "Higiene", stock: 12, minStock: 15, status: "low" },
    { id: "PRD-003", sku: "SKU-C300", name: "Anti-flea Collar Large", category: "Salud", stock: 0, minStock: 5, status: "out" },
    { id: "PRD-004", sku: "SKU-D400", name: "Snacks Naturales 500g", category: "Alimento", stock: 88, minStock: 30, status: "ok" },
    { id: "PRD-005", sku: "SKU-E500", name: "Shampoo Antipulgas 1L", category: "Higiene", stock: 9, minStock: 12, status: "low" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Gestiona el catálogo de productos y SKUs monitoreados por el modelo."
        action={
          <Button>
            <PackagePlus className="w-4 h-4" />
            Nuevo producto
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Productos activos" value="214" icon={Package} accent="primary" change={6} />
        <StatCard title="Stock bajo" value="18" icon={AlertTriangle} accent="warning" change={-4} changeLabel="vs semana anterior" />
        <StatCard title="Agotados" value="5" icon={XCircle} accent="danger" change={2} changeLabel="vs semana anterior" />
      </div>

      <Table
        title="Listado de productos"
        action={
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                placeholder="Buscar SKU…"
                className="bg-surface-soft border border-border rounded-lg py-2 pl-9 pr-3 text-sm w-44 focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
            <Button variant="secondary" size="sm">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </Button>
          </div>
        }
        data={products}
        keyExtractor={(p) => p.id}
        columns={[
          { header: "SKU", accessor: (p) => <span className="font-mono text-text-secondary">{p.sku}</span> },
          { header: "Nombre", accessor: (p) => <span className="font-medium text-text-primary">{p.name}</span> },
          { header: "Categoría", accessor: (p) => <Badge variant="default">{p.category}</Badge> },
          { header: "Stock", accessor: (p) => <span className="font-semibold">{p.stock}</span> },
          { header: "Mínimo", accessor: (p) => <span className="text-text-secondary">{p.minStock}</span> },
          {
            header: "Estado",
            accessor: (p) => (
              <Badge variant={p.status === "ok" ? "success" : p.status === "low" ? "warning" : "danger"} dot>
                {p.status === "ok" ? "Normal" : p.status === "low" ? "Bajo" : "Agotado"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
