"use client";

import { useMemo, useState } from "react";
import { Table, Badge } from "@/components/ui/Table";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { productsApi, salesApi } from "@/lib/api";

const soles = (v: number) =>
  `S/ ${v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAGE_SIZE = 50;
const WIDE_START = "2000-01-01";
const WIDE_END = "2100-01-01";

/**
 * The materialized sales records, shown right where the user uploads them. Filter by
 * product (server-side, whole history) or browse all recent sales page by page.
 */
export function SalesLog({ companyId }: { companyId: string }) {
  const [productId, setProductId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const products = useApi(() => productsApi.list(companyId), [companyId]);

  // "all" -> paginated recent sales; a product -> its full history (server-filtered).
  const sales = useApi(() => {
    if (productId === "all") return salesApi.list(companyId, page, PAGE_SIZE);
    return salesApi.listByProduct(companyId, productId, from || WIDE_START, to || WIDE_END);
  }, [companyId, productId, page, productId === "all" ? "" : from, productId === "all" ? "" : to]);

  const productOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products.data]);

  const rows = sales.data ?? [];
  const units = rows.reduce((a, s) => a + s.quantity, 0);
  const revenue = rows.reduce((a, s) => a + Number(s.total_amount), 0);
  const isAll = productId === "all";

  const onProduct = (v: string) => {
    setProductId(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Producto</label>
          <select
            value={productId}
            onChange={(e) => onProduct(e.target.value)}
            className="rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Todos los productos</option>
            {(products.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>
            ))}
          </select>
        </div>

        {!isAll && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Desde</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Hasta</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-text-secondary"><b className="text-text-primary tabular-nums">{rows.length.toLocaleString("es-PE")}</b> ventas</span>
          <span className="text-text-secondary"><b className="text-text-primary tabular-nums">{units.toLocaleString("es-PE")}</b> uds.</span>
          <span className="text-text-secondary"><b className="text-text-primary tabular-nums">{soles(revenue)}</b></span>
        </div>
      </div>

      <DataState
        loading={sales.loading}
        error={sales.error}
        empty={rows.length === 0}
        onRetry={sales.reload}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="Sin ventas en este filtro"
            description={isAll
              ? "Aún no hay ventas registradas. Sube tu CSV arriba y pulsa «Preparar dataset» para materializarlas."
              : "Este producto no tiene ventas en el rango elegido. Prueba con otro producto o amplía las fechas."}
          />
        }
      >
        <Table
          data={rows}
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
                ) : <span className="font-mono text-text-secondary">{s.product_id.slice(0, 8)}</span>;
              },
            },
            { header: "Cantidad", accessor: (s) => <span className="tabular-nums">{s.quantity}</span> },
            { header: "Precio unit.", accessor: (s) => <span className="text-text-secondary tabular-nums">{soles(Number(s.unit_price))}</span> },
            { header: "Total", accessor: (s) => <span className="font-semibold text-text-primary tabular-nums">{soles(Number(s.total_amount))}</span> },
            { header: "Origen", accessor: (s) => (s.batch_id ? <Badge variant="violet">Carga</Badge> : <Badge variant="default">Manual</Badge>) },
          ]}
        />
      </DataState>

      {/* Pagination only in "Todos" mode (server-paginated). */}
      {isAll && rows.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn("inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm",
              page === 1 ? "text-text-muted opacity-50" : "text-text-primary hover:border-primary/40")}
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-sm text-text-secondary tabular-nums">Página {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={rows.length < PAGE_SIZE}
            className={cn("inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm",
              rows.length < PAGE_SIZE ? "text-text-muted opacity-50" : "text-text-primary hover:border-primary/40")}
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
