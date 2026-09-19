"use client";

import { Select } from "@/components/ui/Select";
import { inputClass, soles } from "@/lib/ui";
import type { CustomFieldDTO } from "@/types/custom-fields";

type Value = string | number | boolean | null | undefined;

/** Form control for one custom field, picked by its type. */
export function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDTO;
  value: Value;
  onChange: (value: string | number | boolean | null) => void;
}) {
  switch (field.field_type) {
    case "boolean":
      return (
        <Select
          value={value === true ? "true" : value === false ? "false" : ""}
          placeholder="—"
          options={[
            { value: "true", label: "Sí" },
            { value: "false", label: "No" },
          ]}
          onChange={(v) => onChange(v === "true")}
        />
      );
    case "select":
      return (
        <Select
          value={value == null ? "" : String(value)}
          placeholder="Selecciona…"
          options={field.options.map((o) => ({ value: o, label: o }))}
          onChange={(v) => onChange(v)}
        />
      );
    case "number":
    case "currency":
      return (
        <input
          type="number"
          step={field.field_type === "currency" ? "0.01" : "any"}
          className={inputClass()}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className={inputClass()}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    default:
      return (
        <input
          type={field.field_type === "url" ? "url" : "text"}
          className={inputClass()}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/** Display a custom value inside a table cell. */
export function formatCustomValue(field: CustomFieldDTO, value: Value): string {
  if (value == null || value === "") return "—";
  switch (field.field_type) {
    case "boolean":
      return value === true || value === "true" ? "Sí" : "No";
    case "currency":
      return soles(Number(value));
    case "number":
      return Number(value).toLocaleString("es-PE");
    case "date": {
      const s = String(value);
      return /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s;
    }
    default:
      return String(value);
  }
}
