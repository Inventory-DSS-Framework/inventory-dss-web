"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/lib/api";
import type { ReportType } from "@/types/api";

interface ReportFormModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  onSaved: () => void;
}

const REPORT_TYPES: { value: ReportType; label: string; hint: string }[] = [
  { value: "forecast", label: "¿Cuánto venderé?", hint: "Cuánto calculamos que venderás de cada producto. Úsalo para planificar tus compras." },
  { value: "kpi", label: "Mis números", hint: "Para cuántos días te alcanza el stock y qué productos se pueden acabar." },
  { value: "recommendation", label: "Qué comprar", hint: "La lista de compras sugerida. Llévala a tu proveedor." },
];

export function ReportFormModal({ open, onClose, companyId, onSaved }: ReportFormModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReportType>("forecast");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setType("forecast");
    setError(null);
  }, [open]);

  const submit = async () => {
    if (!companyId) return;
    // The name is optional for the owner: default to "<tipo> — <fecha>".
    const label = REPORT_TYPES.find((rt) => rt.value === type)?.label ?? "Reporte";
    const name = title.trim() || `${label} — ${new Date().toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}`;
    setSaving(true);
    setError(null);
    try {
      await reportsApi.create(companyId, { title: name, report_type: type });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generar reporte"
      description="Se genera al instante y queda disponible para descargar."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generar"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <label className="block">
          <span className="block text-sm font-medium text-text-primary mb-1.5">
            Ponle un nombre <span className="font-normal text-text-muted">(opcional)</span>
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej.: Compras de junio"
            className="w-full bg-surface-soft border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </label>

        <div>
          <span className="block text-sm font-medium text-text-primary mb-2">¿Qué quieres descargar?</span>
          <div className="space-y-2">
            {REPORT_TYPES.map((rt) => {
              const active = rt.value === type;
              return (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setType(rt.value)}
                  className={cn(
                    "w-full text-left rounded-2xl border px-4 py-3 transition-colors",
                    active
                      ? "border-primary/40 bg-primary-soft/60"
                      : "border-border bg-surface-soft hover:border-text-muted/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-primary">{rt.label}</span>
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-colors",
                        active ? "border-primary bg-primary" : "border-text-muted/40",
                      )}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{rt.hint}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
