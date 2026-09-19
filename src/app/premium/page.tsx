"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCompanyId } from "@/hooks/useCompanyId";
import { usePlan } from "@/hooks/usePlan";
import { useRole } from "@/hooks/useRole";
import { companiesApi, productsApi, salesApi, suppliersApi } from "@/lib/api";
import { billingPlansApi } from "@/lib/apis/billing";
import type { BillingCycle, PaymentDTO, PlanDTO } from "@/types/billing";
import { PremiumIntro } from "@/components/premium/PremiumIntro";
import { PremiumManage } from "@/components/premium/PremiumManage";
import { PremiumOverlay } from "@/components/premium/PremiumOverlay";
import type { CompanyStats } from "@/components/premium/IntroScenes";
import { FALLBACK_PLANS, closePremium, prefersReducedMotion } from "@/components/premium/plan-data";

export default function PremiumPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const plan = usePlan();
  const { isAdmin } = useRole();

  const [reduced, setReduced] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<PlanDTO[]>(FALLBACK_PLANS);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [payments, setPayments] = useState<PaymentDTO[] | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  useEffect(() => {
    billingPlansApi.plans().then((p) => p.length && setPlans(p)).catch(() => undefined);
  }, []);

  // The company's own numbers, for the personalized scene. Every call may fail independently.
  useEffect(() => {
    if (!companyId) return;
    let active = true;
    Promise.allSettled([
      companiesApi.get(companyId),
      productsApi.list(companyId),
      suppliersApi.list(companyId),
      salesApi.list(companyId, 1, 100),
    ]).then(([company, products, suppliers, sales]) => {
      if (!active) return;
      const salesCount = sales.status === "fulfilled" ? sales.value.length : null;
      setStats({
        companyName: company.status === "fulfilled" ? company.value.name : null,
        products: products.status === "fulfilled" ? products.value.filter((p) => p.is_active !== false).length : null,
        suppliers: suppliers.status === "fulfilled" ? suppliers.value.length : null,
        sales: salesCount,
        salesCapped: salesCount !== null && salesCount >= 100,
      });
    });
    return () => {
      active = false;
    };
  }, [companyId]);

  const loadPayments = useCallback(() => {
    if (!companyId) return;
    billingPlansApi.payments(companyId).then(setPayments).catch(() => setPayments([]));
  }, [companyId]);

  useEffect(() => {
    if (plan.isPremium) loadPayments();
  }, [plan.isPremium, loadPayments]);

  const close = useCallback(() => closePremium(router), [router]);
  const checkout = () => router.push(`/premium/checkout?cycle=${cycle}`);

  if (plan.loading || reduced === null) {
    return (
      <PremiumOverlay label="Plan Premium" onClose={close}>
        <div className="grid h-full place-items-center">
          <Loader2 className="h-6 w-6 animate-spin ps-fg-3" />
        </div>
      </PremiumOverlay>
    );
  }

  if (plan.isPremium && plan.subscription && !showIntro) {
    return (
      <PremiumOverlay label="Tu plan Premium" onClose={close}>
        <PremiumManage
          subscription={plan.subscription}
          payments={payments}
          canManage={isAdmin}
          onReplay={() => setShowIntro(true)}
          onCancel={async () => {
            await billingPlansApi.cancel(companyId!);
            plan.reload();
          }}
          onResume={async () => {
            await billingPlansApi.resume(companyId!);
            plan.reload();
          }}
        />
      </PremiumOverlay>
    );
  }

  return (
    <PremiumIntro
      plans={plans}
      stats={stats}
      reduced={reduced}
      cycle={cycle}
      onCycle={setCycle}
      onCheckout={checkout}
      onClose={showIntro ? () => setShowIntro(false) : close}
    />
  );
}
