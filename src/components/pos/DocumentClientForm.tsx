"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/lib/ui";
import type { SalesDocumentType } from "@/types/pos";
import { BOLETA_ID_THRESHOLD, isValidDni, isValidRuc } from "./peru";

export interface ClientData {
  docNumber: string;
  name: string;
  address: string;
}

const DOCS: { id: SalesDocumentType; label: string }[] = [
  { id: "boleta", label: "Boleta" },
  { id: "factura", label: "Factura" },
  { id: "nota_venta", label: "Nota de venta" },
];

/** Returns the first blocking problem with the client data, or null if it can be issued. */
export function clientError(doc: SalesDocumentType, client: ClientData, total: number): string | null {
  const number = client.docNumber.trim();
  const name = client.name.trim();
  if (doc === "factura") {
    if (!number) return "Ingresa el RUC del cliente para emitir la factura.";
    if (!isValidRuc(number)) return "El RUC no es válido (11 dígitos, empieza con 10/15/17/20 y dígito verificador correcto).";
    if (!name) return "Ingresa la razón social del cliente.";
    return null;
  }
  if (doc === "boleta") {
    if (number && !isValidDni(number)) return "El DNI debe tener 8 dígitos.";
    if (total >= BOLETA_ID_THRESHOLD && (!number || !name))
      return `Boletas de S/ ${BOLETA_ID_THRESHOLD}.00 o más requieren DNI y nombre del cliente (SUNAT).`;
  }
  if (doc === "nota_venta" && number && !isValidDni(number) && !isValidRuc(number)) {
    return "El documento debe ser un DNI (8 dígitos) o un RUC válido.";
  }
  return null;
}

export function clientDocType(doc: SalesDocumentType, number: string): "dni" | "ruc" | "none" {
  const n = number.trim();
  if (doc === "factura") return "ruc";
  if (!n) return "none";
  return n.length === 11 ? "ruc" : "dni";
}

export function DocumentClientForm({
  doc,
  onDoc,
  client,
  onClient,
  total,
}: {
  doc: SalesDocumentType;
  onDoc: (d: SalesDocumentType) => void;
  client: ClientData;
  onClient: (c: ClientData) => void;
  total: number;
}) {
  const number = client.docNumber.trim();
  const requiresId = doc === "boleta" && total >= BOLETA_ID_THRESHOLD;
  const rucOk = doc === "factura" && isValidRuc(number);
  const rucBad = doc === "factura" && number.length === 11 && !rucOk;
  const dniBad = doc !== "factura" && number.length > 0 && number.length !== 8 && !(doc === "nota_venta" && isValidRuc(number));
  const set = (patch: Partial<ClientData>) => onClient({ ...client, ...patch });

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Comprobante</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted/70 p-1" role="radiogroup">
          {DOCS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={doc === d.id}
              onClick={() => onDoc(d.id)}
              className={cn(
                "h-9 rounded-lg text-sm font-medium transition-all",
                doc === d.id ? "bg-surface text-text-primary shadow-soft" : "text-text-muted hover:text-text-secondary",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {doc === "factura" ? (
        <div className="space-y-2.5">
          <div className="relative">
            <input
              value={client.docNumber}
              onChange={(e) => set({ docNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              placeholder="RUC del cliente *"
              inputMode="numeric"
              className={inputClass(rucBad, "pr-9 font-mono")}
              aria-label="RUC"
            />
            {rucOk && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />}
          </div>
          {rucBad && <p className="text-xs text-danger">RUC inválido: revisa el dígito verificador.</p>}
          <input
            value={client.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Razón social *"
            className={inputClass()}
            aria-label="Razón social"
          />
          <input
            value={client.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="Dirección fiscal"
            className={inputClass()}
            aria-label="Dirección"
          />
        </div>
      ) : (
        <div className="grid grid-cols-[130px_1fr] gap-2.5">
          <input
            value={client.docNumber}
            onChange={(e) => set({ docNumber: e.target.value.replace(/\D/g, "").slice(0, doc === "nota_venta" ? 11 : 8) })}
            placeholder={requiresId ? "DNI *" : "DNI (opcional)"}
            inputMode="numeric"
            className={inputClass(dniBad || (requiresId && !number), "font-mono")}
            aria-label="DNI"
          />
          <input
            value={client.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={requiresId ? "Nombre del cliente *" : "Nombre del cliente (opcional)"}
            className={inputClass(requiresId && !client.name.trim())}
            aria-label="Nombre del cliente"
          />
          {requiresId && (
            <p className="col-span-2 text-xs text-warning">
              Total ≥ S/ {BOLETA_ID_THRESHOLD}.00: SUNAT exige DNI y nombre en la boleta.
            </p>
          )}
          {doc === "nota_venta" && (
            <p className="col-span-2 text-xs text-text-muted">Ticket interno: no genera comprobante electrónico.</p>
          )}
        </div>
      )}
    </div>
  );
}
