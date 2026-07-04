"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingCart, Receipt, Coins, Boxes } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { productsApi, salesApi } from "@/lib/api";

const soles = (v: number) => `S/ ${v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SalesPage() {
  const companyId = useCompanyId();
  const sales = useApi(
    () => (companyId ? salesApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  const products = useApi(
    () => (companyId ? productsApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  const items = sales.data ?? [];

  const productOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products.data]);

  const totalUnits = items.reduce((a, s) => a + s.quantity, 0);
  const totalRevenue = items.reduce((a, s) => a + Number(s.total_amount), 0);
  const skuCount = new Set(items.map((s) => s.product_id)).size;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Registro de ventas"
        description="Transacciones de venta derivadas de tus cargas — la base del análisis de demanda."
      />

      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <StatCard title="Transacciones" value={items.length.toLocaleString("es-PE")} icon={Receipt} accent="primary" />
          <StatCard title="Unidades vendidas" value={totalUnits.toLocaleString("es-PE")} icon={Boxes} accent="violet" />
          <StatCard title="Ingresos" value={soles(totalRevenue)} icon={Coins} accent="success" />
          <StatCard title="Productos con ventas" value={String(skuCount)} icon={ShoppingCart} accent="primary" />
        </div>
      )}

      <DataState
        loading={sales.loading}
        error={sales.error}
        empty={items.length === 0}
        onRetry={sales.reload}
        emptyState={
          <EmptyState
            icon={ShoppingCart}
            title="Aún no hay ventas registradas"
            description="Las ventas se generan al preparar un dataset desde tu carga: sube el CSV en Ventas y pulsa «Preparar dataset». Aquí verás cada transacción."
            action={{ label: "Ir a Ventas", href: "/ingestion" }}
            hint="La cantidad y fecha vienen del archivo; el precio se toma de tu catálogo de productos."
          />
        }
      >
        <Table
          title={`${items.length.toLocaleString("es-PE")} ventas más recientes`}
          data={items}
          keyExtractor={(s) => s.id}
          columns={[
            { header: "Fecha", accessor: (s) => <span className="text-text-secondary tabular-nums">{s.sale_date}</span> },
            {
              header: "Producto",
              accessor: (s) => {
                const p = productOf(s.product_id);
                return p ? (
                  <div className="min-w-0">
                    <span className="font-medium text-text-primary block truncate">{p.name}</span>
                    <span className="font-mono text-[11px] text-text-muted">{p.sku}</span>
                  </div>
                ) : (
                  <span className="font-mono text-text-secondary">{s.product_id.slice(0, 8)}</span>
                );
              },
            },
            { header: "Cantidad", accessor: (s) => <span className="tabular-nums">{s.quantity}</span> },
            { header: "Precio unit.", accessor: (s) => <span className="text-text-secondary tabular-nums">{soles(Number(s.unit_price))}</span> },
            { header: "Total", accessor: (s) => <span className="font-semibold text-text-primary tabular-nums">{soles(Number(s.total_amount))}</span> },
            { header: "Origen", accessor: (s) => (s.batch_id ? <Badge variant="violet">Carga</Badge> : <Badge variant="default">Manual</Badge>) },
          ]}
        />
      </DataState>
    </div>
  );
}
