"use client";

import { useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { forecastingApi, productsApi, salesApi } from "@/lib/api";

export interface OnboardingStep {
  key: "catalog" | "sales" | "forecast";
  /** Which phase this step belongs to — the two halves of the product. */
  phase: "erp" | "ftgm";
  /** Step number *within its phase* (both phases restart at 1) — mirrors the sidebar. */
  step: number;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
  /** Short status shown when the step is complete (e.g. "12 productos"). */
  detail?: string;
}

export interface OnboardingState {
  loading: boolean;
  steps: OnboardingStep[];
  completed: number;
  total: number;
  allDone: boolean;
  /** First not-yet-done step — the recommended next action. */
  next: OnboardingStep | null;
  reload: () => void;
}

/**
 * Derives start-up progress from real backend state: two ERP milestones (catalog, a
 * first sale) plus one Motor FTGM milestone (a completed run) — mirrors the sidebar's
 * "ERP" / "Motor FTGM" split so the Panel and the nav always tell the same story.
 */
export function useOnboarding(companyId: string | null): OnboardingState {
  const products = useApi(
    () => (companyId ? productsApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  // A "first sale" counts whether it came from Nueva Venta or a bulk CSV import.
  const sales = useApi(
    () => (companyId ? salesApi.list(companyId, 1, 1) : Promise.resolve([])),
    [companyId],
  );
  const runs = useApi(
    () => (companyId ? forecastingApi.listRuns(companyId) : Promise.resolve([])),
    [companyId],
  );

  const loading = products.loading || sales.loading || runs.loading;

  const state = useMemo<Omit<OnboardingState, "loading" | "reload">>(() => {
    const nProducts = (products.data ?? []).length;
    const hasSales = (sales.data ?? []).length > 0;
    const okRuns = (runs.data ?? []).filter((r) => r.status === "success").length;

    const steps: OnboardingStep[] = [
      {
        key: "catalog",
        phase: "erp",
        step: 1,
        title: "Registra tu catálogo",
        description: "Tus productos: SKU, costo, precio. Es la base contra la que se cruzan las ventas.",
        href: "/products",
        cta: "Ir a Catálogo",
        done: nProducts > 0,
        detail: nProducts > 0 ? `${nProducts} producto(s)` : undefined,
      },
      {
        key: "sales",
        phase: "erp",
        step: 2,
        title: "Registra tu primera venta",
        description: "Anota una venta a mano en Nueva venta, o importa un historial completo por CSV.",
        href: "/sales/new",
        cta: "Ir a Nueva venta",
        done: hasSales,
        detail: hasSales ? "Ventas registradas" : undefined,
      },
      {
        key: "forecast",
        phase: "ftgm",
        step: 1,
        title: "Ejecuta el motor FTGM",
        description: "Analiza tus datos por producto y corre el pronóstico de demanda.",
        href: "/forecasting",
        cta: "Ir a Pronóstico",
        done: okRuns > 0,
        detail: okRuns > 0 ? `${okRuns} pronóstico(s)` : undefined,
      },
    ];

    const completed = steps.filter((s) => s.done).length;
    // The next action is the first incomplete step (steps are inherently ordered).
    const next = steps.find((s) => !s.done) ?? null;
    return { steps, completed, total: steps.length, allDone: completed === steps.length, next };
  }, [products.data, sales.data, runs.data]);

  const reload = () => {
    products.reload();
    sales.reload();
    runs.reload();
  };

  return { loading, reload, ...state };
}
