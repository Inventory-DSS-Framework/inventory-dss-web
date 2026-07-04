"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Badge } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScanSearch, Boxes } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { inventoryApi, productsApi } from "@/lib/api";
import type { ProductDTO } from "@/types/api";

const typeLabel: Record<string, string> = {
  inbound: "Entrada",
  outbound: "Salida",
  adjustment: "Ajuste",
};

type StockStatus = { label: string; variant: "success" | "warning" | "danger" };
function stockStatus(onHand: number, reorder: number, safety: number): StockStatus {
  if (onHand <= 0) return { label: "Sin stock", variant: "danger" };
  if (onHand <= safety) return { label: "Crítico", variant: "danger" };
  if (onHand <= reorder) return { label: "Bajo reorden", variant: "warning" };
  return { label: "OK", variant: "success" };
}

export default function InventoryPage() {
  const companyId = useCompanyId();
  const [tab, setTab] = useState("stock");
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const stock = useApi(() => (companyId ? inventoryApi.currentStockAll(companyId) : Promise.resolve([])), [companyId]);
  const movements = useApi(() => (companyId ? inventoryApi.listMovements(companyId) : Promise.resolve([])), [companyId]);
  const replenishments = useApi(() => (companyId ? inventoryApi.listReplenishments(companyId) : Promise.resolve([])), [companyId]);
  const stockouts = useApi(() => (companyId ? inventoryApi.listStockouts(companyId) : Promise.resolve([])), [companyId]);

  const skuOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p.sku]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [products.data]);

  // Join current stock with the product catalog (name, reorder, safety) for the table.
  const stockRows = useMemo(() => {
    const onHand = new Map((stock.data ?? []).map((s) => [s.product_id, s.quantity_on_hand]));
    return (products.data ?? [])
      .filter((p) => p.is_active)
      .map((p: ProductDTO) => ({
        product: p,
        onHand: onHand.get(p.id) ?? 0,
      }))
      .sort((a, b) => a.onHand - b.onHand);
  }, [products.data, stock.data]);

  const detect = async () => {
    if (!companyId) return;
    setWorking(true);
    setActionError(null);
    try {
      await inventoryApi.detectStockouts(companyId);
      stockouts.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo detectar quiebres");
    } finally {
      setWorking(false);
    }
  };

  const tabs = [
    { id: "stock", label: "Stock actual", count: stockRows.length },
    { id: "movements", label: "Movimientos", count: (movements.data ?? []).length },
    { id: "replenishments", label: "Reabastecimientos", count: (replenishments.data ?? []).length },
    { id: "stockouts", label: "Quiebres", count: (stockouts.data ?? []).length },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        eyebrow="Datos"
        title="Inventario"
        description="Movimientos del libro, reabastecimientos sugeridos y quiebres de stock detectados."
        action={
          tab === "stockouts" ? (
            <Button variant="violet" onClick={detect} disabled={working || !companyId}>
              <ScanSearch className="w-4 h-4" />
              {working ? "Detectando…" : "Detectar quiebres"}
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "stock" && (
        <DataState
          loading={products.loading || stock.loading}
          error={products.error || stock.error}
          empty={stockRows.length === 0}
          onRetry={() => { products.reload(); stock.reload(); }}
          emptyState={
            <EmptyState
              icon={Boxes}
              title="Aún no hay stock registrado"
              description="El stock inicial se siembra al preparar un dataset desde tus ventas. Sube tu CSV y pulsa «Preparar dataset» para ver aquí el stock de cada producto."
              action={{ label: "Ir a Ventas", href: "/ingestion" }}
            />
          }
        >
          <Table
            title="Stock actual por producto"
            data={stockRows}
            keyExtractor={(r) => r.product.id}
            columns={[
              {
                header: "Producto",
                accessor: (r) => (
                  <div className="min-w-0">
                    <span className="font-medium text-text-primary block truncate">{r.product.name}</span>
                    <span className="font-mono text-[11px] text-text-muted">{r.product.sku}</span>
                  </div>
                ),
              },
              { header: "Stock actual", accessor: (r) => <span className="font-semibold text-text-primary tabular-nums">{r.onHand}</span> },
              { header: "Punto reorden", accessor: (r) => <span className="text-text-secondary tabular-nums">{r.product.reorder_point}</span> },
              { header: "Stock seguridad", accessor: (r) => <span className="text-text-secondary tabular-nums">{r.product.safety_stock}</span> },
              {
                header: "Estado",
                accessor: (r) => {
                  const st = stockStatus(r.onHand, r.product.reorder_point, r.product.safety_stock);
                  return <Badge variant={st.variant} dot>{st.label}</Badge>;
                },
              },
            ]}
          />
        </DataState>
      )}

      {tab === "movements" && (
        <DataState
          loading={movements.loading}
          error={movements.error}
          empty={(movements.data ?? []).length === 0}
          emptyMessage="Aún no hay movimientos de inventario."
          onRetry={movements.reload}
        >
          <Table
            title="Movimientos de inventario"
            data={movements.data ?? []}
            keyExtractor={(m) => m.id}
            columns={[
              { header: "Fecha", accessor: (m) => m.occurred_at.slice(0, 10) },
              { header: "Producto", accessor: (m) => <span className="font-mono text-text-secondary">{skuOf(m.product_id)}</span> },
              {
                header: "Tipo",
                accessor: (m) => (
                  <Badge variant={m.movement_type === "inbound" ? "success" : m.movement_type === "outbound" ? "primary" : "warning"} dot>
                    {typeLabel[m.movement_type] ?? m.movement_type}
                  </Badge>
                ),
              },
              {
                header: "Cantidad",
                accessor: (m) => (
                  <span className={m.movement_type === "outbound" ? "font-semibold text-danger" : "font-semibold text-success"}>
                    {m.movement_type === "outbound" ? "-" : "+"}
                    {m.quantity}
                  </span>
                ),
              },
              { header: "Motivo", accessor: (m) => <span className="text-text-secondary">{m.reason || "—"}</span> },
            ]}
          />
        </DataState>
      )}

      {tab === "replenishments" && (
        <DataState
          loading={replenishments.loading}
          error={replenishments.error}
          empty={(replenishments.data ?? []).length === 0}
          emptyMessage="No hay reabastecimientos sugeridos."
          onRetry={replenishments.reload}
        >
          <Table
            title="Reabastecimientos sugeridos"
            data={replenishments.data ?? []}
            keyExtractor={(r) => r.id}
            columns={[
              { header: "Producto", accessor: (r) => <span className="font-mono text-text-secondary">{skuOf(r.product_id)}</span> },
              { header: "Cantidad sugerida", accessor: (r) => <span className="font-semibold text-text-primary">{r.quantity} uds.</span> },
              {
                header: "Estado",
                accessor: (r) => (
                  <Badge variant={r.status === "completed" ? "success" : r.status === "pending" ? "warning" : "default"} dot>
                    {r.status}
                  </Badge>
                ),
              },
            ]}
          />
        </DataState>
      )}

      {tab === "stockouts" && (
        <DataState
          loading={stockouts.loading}
          error={stockouts.error}
          empty={(stockouts.data ?? []).length === 0}
          emptyMessage="No se han detectado quiebres de stock."
          onRetry={stockouts.reload}
        >
          <Table
            title="Quiebres de stock"
            data={stockouts.data ?? []}
            keyExtractor={(s) => s.id}
            columns={[
              { header: "Producto", accessor: (s) => <span className="font-mono text-text-secondary">{skuOf(s.product_id)}</span> },
              { header: "Inicio", accessor: (s) => s.started_at.slice(0, 10) },
              { header: "Fin", accessor: (s) => (s.ended_at ? s.ended_at.slice(0, 10) : "—") },
              { header: "Duración", accessor: (s) => (s.duration_days != null ? `${s.duration_days} días` : "—") },
              {
                header: "Estado",
                accessor: (s) => (
                  <Badge variant={s.ended_at ? "success" : "danger"} dot>
                    {s.ended_at ? "Resuelto" : "En curso"}
                  </Badge>
                ),
              },
            ]}
          />
        </DataState>
      )}
    </div>
  );
}
