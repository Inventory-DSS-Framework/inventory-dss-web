"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle, Lightbulb, PackageSearch, ShoppingCart, Sparkles, Wallet, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { DataState } from "@/components/ui/DataState";
import { EmptyState } from "@/components/ui/EmptyState";
import { soles } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { productsApi, recommendationsApi } from "@/lib/api";
import type { RecommendationPriority, RecommendationStatus } from "@/types/api";

const priorityMeta: Record<RecommendationPriority, { label: string; tone: "danger" | "warning" | "primary"; bar: string }> = {
  high: { label: "Urgente", tone: "danger", bar: "bg-danger" },
  medium: { label: "Pronto", tone: "warning", bar: "bg-warning" },
  low: { label: "Planificar", tone: "primary", bar: "bg-primary" },
};
const statusLabel: Record<RecommendationStatus, string> = {
  pending: "Pendiente",
  accepted: "Aprobada",
  dismissed: "Descartada",
};
const ORDER: Record<RecommendationPriority, number> = { high: 0, medium: 1, low: 2 };

export default function RecommendationsPage() {
  const companyId = useCompanyId();
  const [working, setWorking] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<RecommendationStatus>("pending");

  const recs = useApi(() => (companyId ? recommendationsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const products = useApi(() => (companyId ? productsApi.list(companyId) : Promise.resolve([])), [companyId]);
  const productOf = useMemo(() => {
    const map = new Map((products.data ?? []).map((p) => [p.id, p]));
    return (id: string) => map.get(id);
  }, [products.data]);

  const all = recs.data ?? [];
  const items = all.filter((r) => r.status === tab).sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  const pending = all.filter((r) => r.status === "pending");
  const investment = pending.reduce((acc, r) => acc + r.recommended_quantity * Number(productOf(r.product_id)?.unit_cost ?? 0), 0);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setWorking(key);
    setActionError(null);
    try {
      await fn();
      recs.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Operación fallida");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="Motor FTGM"
        eyebrowTone="violet"
        title="Recomendaciones de compra"
        description="Cuánto reponer de cada producto, cruzando el pronóstico FTGM con tu stock actual, lead time y stock de seguridad."
        action={
          <Button variant="violet" loading={working === "generate"} disabled={!companyId || !!working} onClick={() => companyId && run("generate", () => recommendationsApi.generate(companyId))}>
            <Sparkles className="h-4 w-4" /> Recalcular
          </Button>
        }
      />

      {actionError && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{actionError}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary icon={ShoppingCart} label="Pendientes" value={`${pending.length}`} hint={`${pending.filter((r) => r.priority === "high").length} urgentes`} />
        <Summary icon={Wallet} label="Inversión estimada" value={soles(investment)} hint="cantidad × costo promedio" />
        <Summary icon={CheckCircle} label="Aprobadas" value={`${all.filter((r) => r.status === "accepted").length}`} hint="listas para comprar" />
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as RecommendationStatus)}
        tabs={(["pending", "accepted", "dismissed"] as const).map((s) => ({
          id: s,
          label: statusLabel[s],
          count: all.filter((r) => r.status === s).length,
        }))}
      />

      <DataState
        loading={recs.loading}
        error={recs.error}
        empty={items.length === 0}
        onRetry={recs.reload}
        emptyState={
          <EmptyState
            icon={Lightbulb}
            title={tab === "pending" ? "Sin recomendaciones pendientes" : `Sin recomendaciones ${statusLabel[tab].toLowerCase()}s`}
            description="Se generan solas cada vez que el motor FTGM termina un pronóstico (también de un solo producto)."
            action={{ label: "Ir al motor FTGM", href: "/forecasting" }}
          />
        }
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((rec) => {
            const p = productOf(rec.product_id);
            const meta = priorityMeta[rec.priority];
            const cost = rec.recommended_quantity * Number(p?.unit_cost ?? 0);
            return (
              <Card key={rec.id} className="relative flex h-full flex-col overflow-hidden">
                <span className={cn("absolute left-0 top-0 h-full w-1", meta.bar)} />
                <div className="mb-3 flex items-start justify-between gap-3">
                  <Badge variant={meta.tone} dot>
                    {meta.label}
                  </Badge>
                  {tab !== "pending" && <Badge>{statusLabel[rec.status]}</Badge>}
                </div>
                {p ? (
                  <Link href={`/inventory/${p.id}`} className="group">
                    <h3 className="text-sm font-semibold leading-snug text-text-primary group-hover:text-accent-violet">{p.name}</h3>
                    <span className="font-mono text-[11px] text-text-muted">{p.sku}</span>
                  </Link>
                ) : (
                  <h3 className="text-sm font-semibold text-text-primary">Producto {rec.product_id.slice(0, 8)}</h3>
                )}
                <div className="my-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-accent-violet-soft/40 px-3 py-2">
                    <p className="text-[10.5px] text-text-muted">Comprar</p>
                    <p className="font-display text-lg font-semibold text-text-primary">{rec.recommended_quantity} u</p>
                  </div>
                  <div className="rounded-xl bg-surface-soft px-3 py-2">
                    <p className="text-[10.5px] text-text-muted">Inversión</p>
                    <p className="font-display text-lg font-semibold text-text-primary">{soles(cost)}</p>
                  </div>
                </div>
                <p className="rounded-2xl bg-surface-soft p-3 text-xs leading-relaxed text-text-secondary">{rec.reason}</p>
                <div className="mt-auto pt-4">
                  {rec.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm" disabled={!!working} loading={working === rec.id + "a"} onClick={() => companyId && run(rec.id + "a", () => recommendationsApi.accept(companyId, rec.id))}>
                        <CheckCircle className="h-4 w-4" /> Aprobar
                      </Button>
                      <Button variant="secondary" size="sm" className="flex-1" disabled={!!working} loading={working === rec.id + "d"} onClick={() => companyId && run(rec.id + "d", () => recommendationsApi.dismiss(companyId, rec.id))}>
                        <X className="h-4 w-4" /> Descartar
                      </Button>
                    </div>
                  ) : p ? (
                    <Link href={`/inventory/${p.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-violet hover:opacity-80">
                      <PackageSearch className="h-3.5 w-3.5" /> Ver producto
                    </Link>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      </DataState>
    </div>
  );
}

function Summary({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-violet-soft text-accent-violet">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="font-display text-xl font-semibold text-text-primary tabular-nums">{value}</p>
        <p className="text-[11px] text-text-muted">{hint}</p>
      </div>
    </div>
  );
}
