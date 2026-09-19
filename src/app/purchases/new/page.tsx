"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, History } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/DataState";
import { PurchaseDocumentForm } from "@/components/purchases/PurchaseDocumentForm";
import { PurchaseImportPanel } from "@/components/purchases/PurchaseImportPanel";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { suppliersApi } from "@/lib/api";
import { customFieldsApi } from "@/lib/apis/custom-fields";
import { purchasingApi } from "@/lib/apis/purchasing";
import type { SupplierDTO } from "@/types/api";
import type { CustomFieldDTO } from "@/types/custom-fields";
import type { PurchaseCatalogItemDTO } from "@/types/purchasing";

type Tab = "register" | "import";

export default function NewPurchasePage() {
  const companyId = useCompanyId();
  const [tab, setTab] = useState<Tab>("register");
  const [initialSupplier, setInitialSupplier] = useState<string | null>(null);

  // Read ?supplier= / ?tab= without useSearchParams (avoids a Suspense boundary).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInitialSupplier(params.get("supplier"));
    if (params.get("tab") === "import") setTab("import");
  }, []);

  const suppliers = useApi(() => (companyId ? suppliersApi.list(companyId) : Promise.resolve([] as SupplierDTO[])), [companyId]);
  const catalog = useApi(() => (companyId ? purchasingApi.catalog(companyId) : Promise.resolve([] as PurchaseCatalogItemDTO[])), [companyId]);
  const productFields = useApi(
    () => (companyId ? customFieldsApi.list(companyId, "product") : Promise.resolve([] as CustomFieldDTO[])),
    [companyId],
  );

  const loading = !companyId || suppliers.loading || catalog.loading;
  const error = suppliers.error || catalog.error;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        eyebrow="ERP · Compras"
        title="Nueva compra"
        description="Registra la factura de tu proveedor: el stock y el costo promedio de cada producto se actualizan al instante."
        action={
          <Link href="/purchases" className="btn btn-secondary h-10 gap-2 px-4 text-sm">
            <History className="h-4 w-4" /> Ver historial de compras
          </Link>
        }
      />

      <Tabs
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: "register", label: "Registrar compra" },
          { id: "import", label: "Carga masiva" },
        ]}
      />

      {loading && !suppliers.data ? (
        <Skeleton />
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      ) : tab === "register" ? (
        <PurchaseDocumentForm
          companyId={companyId}
          suppliers={suppliers.data ?? []}
          catalog={catalog.data ?? []}
          initialSupplierId={initialSupplier}
          onSuppliersChanged={suppliers.reload}
          onRegistered={catalog.reload}
        />
      ) : (
        <PurchaseImportPanel
          key={initialSupplier ?? "none"}
          companyId={companyId}
          suppliers={suppliers.data ?? []}
          productFields={productFields.data ?? []}
          initialSupplierId={initialSupplier}
          onImported={() => {
            catalog.reload();
            productFields.reload();
          }}
        />
      )}
    </div>
  );
}
