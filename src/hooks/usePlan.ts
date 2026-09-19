"use client";

import { useApi } from "./useApi";
import { useCompanyId } from "./useCompanyId";
import { billingApi } from "@/lib/api";
import type { SubscriptionDTO } from "@/types/api";

/** Premium access now: active/trialing premium, or canceled premium not yet past its period end. */
export function hasPremiumAccess(sub: SubscriptionDTO | null | undefined): boolean {
  if (!sub || sub.plan_id !== "premium") return false;
  if (["active", "trialing"].includes(sub.status)) return true;
  return sub.status === "canceled" && new Date(sub.current_period_end).getTime() > Date.now();
}

/**
 * Current plan of the signed-in company. Free = ERP only (FTGM limited to a single
 * product); Premium = the full FTGM engine. A missing subscription counts as free.
 */
export function usePlan() {
  const companyId = useCompanyId();
  const sub = useApi(
    () => (companyId ? billingApi.subscription(companyId).catch(() => null) : Promise.resolve(null)),
    [companyId],
  );
  const isPremium = hasPremiumAccess(sub.data);
  return { isPremium, loading: sub.loading, subscription: sub.data, reload: sub.reload };
}
