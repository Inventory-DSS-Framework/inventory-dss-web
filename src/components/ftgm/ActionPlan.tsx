"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, CalendarClock, PackageSearch, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { OverviewProduct } from "@/types/ftgm";
import { ACTIONS, type ActionId, decide } from "./decisions";

const TONE: Record<string, { chip: string; card: string; icon: string }> = {
  danger: { chip: "bg-danger-soft text-danger", card: "border-danger/30", icon: "bg-danger-soft text-danger" },
  warning: { chip: "bg-warning-soft text-warning", card: "border-warning/30", icon: "bg-warning-soft text-warning" },
  success: { chip: "bg-success-soft text-success", card: "border-border", icon: "bg-success-soft text-success" },
  violet: { chip: "bg-accent-violet-soft text-accent-violet", card: "border-border", icon: "bg-accent-violet-soft text-accent-violet" },
  primary: { chip: "bg-primary-soft text-primary", card: "border-border", icon: "bg-primary-soft text-primary" },
  default: { chip: "bg-surface-muted text-text-secondary", card: "border-border", icon: "bg-surface-muted text-text-secondary" },
};

/**
 * "Qué hacer": the forecast turned into one plain action per product, most urgent first.
 * No forecasting jargon — just what to do, why, and three numbers anyone can read.
 */
export function ActionPlan({ rows }: { rows: OverviewProduct[] }) {
  const decided = useMemo(
    () =>
      rows
        .map((p) => ({ p, d: decide(p) }))
        .sort((a, b) => ACTIONS[a.d.action].order - ACTIONS[b.d.action].order || b.p.next_period_units - a.p.next_period_units),
    [rows],
  );
  const counts = useMemo(() => {
    const c = new Map<ActionId, number>();
    decided.forEach(({ d }) => c.set(d.action, (c.get(d.action) ?? 0) + 1));
    return c;
  }, [decided]);
  const [filter, setFilter] = useState<ActionId | null>(null);
  const shown = filter ? decided.filter(({ d }) => d.action === filter) : decided;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-text-primary">Qué hacer con tus productos</h2>
        <p className="text-sm text-text-secondary">
          Según lo que esperamos que vendas y el stock que tienes hoy. Lo más urgente, primero.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            filter === null ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:text-text-primary",
          )}
        >
          Todos · {decided.length}
        </button>
        {(Object.keys(ACTIONS) as ActionId[])
          .filter((id) => counts.get(id))
          .map((id) => {
            const a = ACTIONS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(filter === id ? null : id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  filter === id ? cn("border-transparent", TONE[a.tone].chip) : "border-border bg-surface text-text-secondary hover:text-text-primary",
                )}
              >
                <a.icon className="h-3.5 w-3.5" /> {a.title} · {counts.get(id)}
              </button>
            );
          })}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {shown.map(({ p, d }) => {
          const a = ACTIONS[d.action];
          const t = TONE[a.tone];
          const buy = d.action === "reponer_ya" || d.action === "reponer";
          return (
            <Card key={p.product_id} className={cn("flex flex-col gap-4 p-5", t.card)}>
              <div className="flex items-start gap-3">
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", t.icon)}>
                  <a.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide", t.chip)}>{a.title}</p>
                  <p className="mt-1.5 truncate font-display text-base font-semibold text-text-primary" title={p.name}>{p.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{d.sentence}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat icon={TrendingUp} label="Vendes" value={d.rate} />
                <Stat icon={Boxes} label="Tienes" value={`${p.on_hand} u`} />
                <Stat icon={CalendarClock} label="Te alcanza" value={d.coverDays != null ? `${d.coverDays} días` : "—"} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-3">
                <span className="text-xs text-text-muted" title="Qué tan acertado fue el cálculo con tus ventas pasadas">
                  Confianza del cálculo: <strong className="text-text-secondary">{d.confidence}</strong>
                  {p.accuracy_pct != null && <> · acertó {Math.round(p.accuracy_pct)}% en el pasado</>}
                </span>
                <div className="flex items-center gap-2">
                  <Link href={`/inventory/${p.product_id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-soft hover:text-text-primary">
                    <PackageSearch className="h-3.5 w-3.5" /> Ver producto
                  </Link>
                  {buy && (
                    <Link href="/purchases/new" className="btn btn-primary gap-1.5 px-3 py-1.5 text-xs">
                      Registrar compra <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-soft px-2 py-2">
      <p className="flex items-center justify-center gap-1 text-[11px] text-text-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="truncate font-display text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
