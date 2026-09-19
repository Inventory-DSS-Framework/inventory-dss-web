import { cn } from "@/lib/utils";

/** Shared input look (matches Select's trigger), so every form reads as one design. */
export function inputClass(error?: string | boolean, extra?: string): string {
  return cn(
    "w-full bg-surface-soft border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-all focus:outline-none focus:bg-surface focus:ring-4",
    error
      ? "border-danger/50 focus:border-danger focus:ring-danger/10"
      : "border-border focus:border-primary/40 focus:ring-primary/10",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    extra,
  );
}

export const soles = (v: number | string | null | undefined) =>
  `S/ ${Number(v ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
