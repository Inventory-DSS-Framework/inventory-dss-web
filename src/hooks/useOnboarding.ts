"use client";

import { useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import {
  dataPreparationApi,
  forecastingApi,
  ingestionApi,
  productsApi,
} from "@/lib/api";

export interface OnboardingStep {
  key: "catalog" | "sales" | "prepare" | "forecast";
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
 * Derives the four-step start-up progress from real backend state, so the Panel can
 * always tell the user where they are and what to do next. The step numbers mirror the
 * "Flujo de datos" group in the sidebar.
 */
export function useOnboarding(companyId: string | null): OnboardingState {
  const products = useApi(
    () => (companyId ? productsApi.list(companyId) : Promise.resolve([])),
    [companyId],
  );
  const uploads = useApi(
    () => (companyId ? ingestionApi.listUploads(companyId) : Promise.resolve([])),
    [companyId],
  );
  const datasets = useApi(
    () => (companyId ? dataPreparationApi.listDatasets(companyId) : Promise.resolve([])),
    [companyId],
  );
  const runs = useApi(
    () => (companyId ? forecastingApi.listRuns(companyId) : Promise.resolve([])),
    [companyId],
  );

  const loading =
    products.loading || uploads.loading || datasets.loading || runs.loading;

  const state = useMemo<Omit<OnboardingState, "loading" | "reload">>(() => {
    const nProducts = (products.data ?? []).length;
    const nUploads = (uploads.data ?? []).length;
    const readyDatasets = (datasets.data ?? []).filter((d) => d.status === "ready").length;
    const okRuns = (runs.data ?? []).filter((r) => r.status === "success").length;

    const steps: OnboardingStep[] = [
      {
        key: "catalog",
        step: 1,
        title: "Crea tu catálogo de productos",
        description: "Registra tus productos (SKU, costo, precio). Las ventas se cruzan contra este catálogo.",
        href: "/products",
        cta: "Ir a Catálogo",
        done: nProducts > 0,
        detail: nProducts > 0 ? `${nProducts} producto(s)` : undefined,
      },
      {
        key: "sales",
        step: 2,
        title: "Sube tu historial de ventas",
        description: "Carga un CSV de ventas, mapea las columnas y valídalo.",
        href: "/ingestion",
        cta: "Ir a Ventas",
        done: nUploads > 0,
        detail: nUploads > 0 ? `${nUploads} carga(s)` : undefined,
      },
      {
        key: "prepare",
        step: 3,
        title: "Prepara el dataset",
        description: "Convierte tus ventas en series de demanda mensuales listas para el modelo.",
        href: "/data-preparation",
        cta: "Ir a Preparación",
        done: readyDatasets > 0,
        detail: readyDatasets > 0 ? `${readyDatasets} dataset(s) listo(s)` : undefined,
      },
      {
        key: "forecast",
        step: 4,
        title: "Ejecuta el pronóstico FTGM",
        description: "Corre el motor sobre tu dataset y explora la demanda pronosticada.",
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
  }, [products.data, uploads.data, datasets.data, runs.data]);

  const reload = () => {
    products.reload();
    uploads.reload();
    datasets.reload();
    runs.reload();
  };

  return { loading, reload, ...state };
}
