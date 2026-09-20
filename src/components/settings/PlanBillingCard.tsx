"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CreditCard, Crown, Landmark, Receipt, Smartphone, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { usePlan } from "@/hooks/usePlan";
import { billingPlansApi } from "@/lib/apis/billing";
import { markPremiumOrigin } from "@/lib/premium-origin";
import { CYCLE_LABEL, METHOD_LABEL, fmtDate, fmtSoles } from "@/components/premium/plan-data";
import type { PaymentMethod } from "@/types/billing";

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  yape: Smartphone,
  transferencia: Landmark,
};

/** Ajustes › Plan y pagos: where you are, when it renews, what you paid. */
export function PlanBillingCard() {
  const companyId = useCompanyId();
  const plan = usePlan();
  const payments = useApi(
    () => (companyId && plan.isPremium ? billingPlansApi.payments(companyId).catch(() => []) : Promise.resolve([])),
    [companyId, plan.isPremium],
  );

  const sub = plan.subscription;
  const canceled = sub?.status === "canceled";
  const end = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const list = (payments.data ?? []).slice(0, 4);

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          {plan.isPremium ? <Crown className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-text-muted">Plan y pagos</p>
          <p className="font-display text-lg font-semibold text-text-primary">
            {plan.loading ? "…" : plan.isPremium ? "Premium" : "Gratis"}
          </p>
        </div>
        {!plan.loading &&
          (plan.isPremium ? (
            <Badge variant={canceled ? "warning" : "success"} dot>{canceled ? "No se renovará" : "Activo"}</Badge>
          ) : (
            <Badge variant="default">Todo el sistema · pronóstico para 1 producto</Badge>
          ))}
      </div>

      {plan.isPremium ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border-soft bg-surface-soft/60 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-text-muted"><CalendarClock className="h-3.5 w-3.5" /> {canceled ? "Acceso hasta" : "Próxima renovación"}</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{end ? fmtDate(end) : "—"}</p>
            </div>
            <div className="rounded-2xl border border-border-soft bg-surface-soft/60 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-text-muted"><Receipt className="h-3.5 w-3.5" /> Último pago</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {list[0] ? `${fmtSoles(list[0].amount)} · ${METHOD_LABEL[list[0].method] ?? list[0].method}` : "Activación de demostración"}
              </p>
            </div>
          </div>

          {list.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Pagos recientes</p>
              <ul className="divide-y divide-border-soft rounded-2xl border border-border">
                {list.map((p) => {
                  const Icon = METHOD_ICON[p.method as PaymentMethod] ?? CreditCard;
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-soft text-text-secondary"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-text-primary">
                          Premium {CYCLE_LABEL[p.billing_cycle]?.toLowerCase() ?? ""} · {METHOD_LABEL[p.method] ?? p.method}
                          {p.card_last4 ? ` •••• ${p.card_last4}` : ""}
                        </span>
                        <span className="block text-[11px] text-text-muted">{fmtDate(p.paid_at)} · Ref. {p.reference}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums text-text-primary">{fmtSoles(p.amount)}</span>
                        <span className="block text-[11px] text-success">{p.status === "paid" ? "Pagado" : p.status}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <Link href="/premium" className="btn btn-secondary h-10 gap-2 px-4 text-sm">
            Gestionar plan y renovación <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary-softer/50 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">Calcula cuánto venderás de todos tus productos</p>
            <p className="text-xs text-text-secondary">Paga con tarjeta, Yape o transferencia. IGV incluido y cancelas cuando quieras.</p>
          </div>
          <Link href="/premium" onClick={markPremiumOrigin} className="btn btn-primary h-10 gap-2 px-4 text-sm">
            <Crown className="h-4 w-4" /> Ver Premium
          </Link>
        </div>
      )}
    </Card>
  );
}
