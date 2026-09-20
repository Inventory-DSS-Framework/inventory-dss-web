"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { useCompanyId } from "@/hooks/useCompanyId";
import { usePlan } from "@/hooks/usePlan";
import { useRole } from "@/hooks/useRole";
import { billingPlansApi } from "@/lib/apis/billing";
import type { BillingCycle, PaymentDTO, PlanDTO } from "@/types/billing";
import { PremiumManage } from "@/components/premium/PremiumManage";
import { PricingCards } from "@/components/premium/PricingCards";
import { PremiumTeaser } from "@/components/premium/PremiumTeaser";
import { PaymentRow, PremiumFaq, ValueStrip } from "@/components/premium/PremiumExtras";
import { FALLBACK_PLANS, prefersReducedMotion } from "@/components/premium/plan-data";
import { clearPremiumOrigin, peekPremiumOrigin, type Origin } from "@/lib/premium-origin";

/**
 * Plans, plainly. A sober page inside the app: the price table and nothing else.
 *
 * When the person got here by pressing a Premium button, a short intro grows out of
 * that button — two slides and the prices — and leaves this same page behind it.
 */
export default function PremiumPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const plan = usePlan();
  const { isAdmin } = useRole();

  const [plans, setPlans] = useState<PlanDTO[]>(FALLBACK_PLANS);
  const [payments, setPayments] = useState<PaymentDTO[] | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  // The intro only plays for a fresh click on a Premium CTA, and only for someone
  // who doesn't have the plan yet.
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [teaser, setTeaser] = useState(false);
  const [teaserDone, setTeaserDone] = useState(false);
  useEffect(() => {
    const o = peekPremiumOrigin();
    setOrigin(o);
    if (!o || prefersReducedMotion()) setTeaserDone(true);
  }, []);
  useEffect(() => {
    if (teaserDone || !origin || plan.loading || plan.isPremium) return;
    clearPremiumOrigin();
    setTeaser(true);
  }, [teaserDone, origin, plan.loading, plan.isPremium]);

  useEffect(() => {
    billingPlansApi.plans().then((p) => p.length && setPlans(p)).catch(() => undefined);
  }, []);

  const loadPayments = useCallback(() => {
    if (!companyId) return;
    billingPlansApi.payments(companyId).then(setPayments).catch(() => setPayments([]));
  }, [companyId]);

  useEffect(() => {
    if (plan.isPremium) loadPayments();
  }, [plan.isPremium, loadPayments]);

  const checkout = () => router.push(`/premium/checkout?cycle=${cycle}`);

  return (
    <div className="ps-light mx-auto max-w-[1100px] space-y-8">
      {teaser && (
        <PremiumTeaser
          plans={plans}
          cycle={cycle}
          onCycle={setCycle}
          onCheckout={checkout}
          origin={origin}
          onClose={() => {
            setTeaser(false);
            setTeaserDone(true);
          }}
        />
      )}
      <PageHeader
        eyebrow="Planes"
        title="Premium"
        description="Tu ERP es gratis para siempre. Premium quita el límite mensual de predicciones con IA y suma el seguimiento y los reportes."
      />

      {plan.loading ? (
        <Card className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        </Card>
      ) : plan.isPremium && plan.subscription ? (
        <div className="space-y-8">
          <PremiumManage
            subscription={plan.subscription}
            payments={payments}
            canManage={isAdmin}
            onCancel={async () => {
              await billingPlansApi.cancel(companyId!);
              plan.reload();
            }}
            onResume={async () => {
              await billingPlansApi.resume(companyId!);
              plan.reload();
            }}
          />
          <PricingCards plans={plans} cycle={cycle} onCycle={setCycle} onCheckout={checkout} isPremium />
          <PremiumFaq />
        </div>
      ) : (
        <div className="space-y-10">
          <ValueStrip />
          <PricingCards plans={plans} cycle={cycle} onCycle={setCycle} onCheckout={checkout} />
          <PaymentRow />
          <PremiumFaq />
        </div>
      )}
    </div>
  );
}
