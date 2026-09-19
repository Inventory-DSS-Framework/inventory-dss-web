"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, ScanBarcode, Tags, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProductImportWizard } from "@/components/inventory/ProductImportWizard";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useColumnConfig } from "@/hooks/useColumnConfig";

export default function InventoryImportPage() {
  const router = useRouter();
  const companyId = useCompanyId();
  const columns = useColumnConfig(companyId, "product");
  const [open, setOpen] = useState(true);

  const tips = [
    { icon: Wand2, title: "Columnas automáticas", text: "Reconocemos “Cód.”, “PVP”, “Existencia”, “Familia”… sin importar el orden." },
    { icon: ScanBarcode, title: "Códigos y correlativo", text: "Usamos tu código como SKU; si falta, asignamos P-000123." },
    { icon: Tags, title: "Categorías al vuelo", text: "“Marca > Tipo” crea el árbol del catálogo automáticamente." },
  ];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver al inventario
      </Link>
      <PageHeader
        eyebrow="ERP · Inventario"
        title="Importar inventario"
        description="Carga tu Excel o CSV de productos con stock, costos y precios. Las filas con error no detienen el resto."
        action={
          <Button onClick={() => setOpen(true)} disabled={!companyId}>
            <FileSpreadsheet className="h-4 w-4" /> Elegir archivo
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {tips.map((t) => (
          <Card key={t.title} className="p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <t.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 font-display text-sm font-semibold text-text-primary">{t.title}</p>
            <p className="mt-1 text-sm text-text-secondary">{t.text}</p>
          </Card>
        ))}
      </div>
      <ProductImportWizard
        open={open}
        onClose={() => setOpen(false)}
        companyId={companyId}
        fields={columns.fields}
        onFinished={() => router.push("/inventory")}
      />
    </div>
  );
}
