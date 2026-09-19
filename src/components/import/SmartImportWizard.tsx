"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Columns3, EyeOff, FileSpreadsheet, Loader2, Pencil,
  Plus, RotateCcw, Search, Sparkles, Trash2, UploadCloud, Wand2, XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select, SelectOption } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import {
  IGNORE, NEW_COLUMN, ImportTargetField, MappingSuggestion, ParsedSheet,
  autoMap, inferType, parseDate, parseNumber, readSpreadsheet, slugify,
} from "@/lib/import/parse";

export type { ImportTargetField } from "@/lib/import/parse";

export interface ImportRow {
  /** 1-based row number as seen in the user's spreadsheet (after the header). */
  rowNumber: number;
  /** Values for built-in targets, normalized: numbers as "12.5", dates as "yyyy-mm-dd". */
  values: Record<string, string>;
  /** Values for custom columns, keyed by custom field key (existing or newly created). */
  custom: Record<string, string>;
}

export interface NewCustomColumn {
  key: string;
  label: string;
  field_type: "text" | "number" | "date";
}

export interface ImportResult {
  created: number;
  updated?: number;
  skipped?: number;
  errors: { row: number; message: string }[];
  /** Optional extra lines shown on the result screen. */
  notes?: string[];
}

interface SmartImportWizardProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Plural noun for what is being imported ("productos", "compras"). */
  entityLabel: string;
  /**
   * Fields the file can feed. Existing custom columns go here too with key
   * `custom:<field key>` so they can be matched like any other field.
   */
  targetFields: ImportTargetField[];
  /** Unmatched headers become new custom columns (created by the caller). */
  allowNewColumns?: boolean;
  /** Extra controls on the preview step (e.g. choose the supplier for a purchase import). */
  mappingExtra?: ReactNode;
  /** Blocks the import button with this message (e.g. "Elige un proveedor"). */
  blockReason?: string | null;
  /** Shown on the upload step: what the file should look like. */
  uploadHint?: ReactNode;
  onImport: (rows: ImportRow[], newColumns: NewCustomColumn[]) => Promise<ImportResult>;
  onFinished?: () => void;
}

type Step = "upload" | "preview" | "done";
type NewType = NewCustomColumn["field_type"];
type Cell = { value: string; bad: boolean; msg?: string };
type Built = { index: number; row: ImportRow; errors: string[]; cells: Cell[] };

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Elige tu archivo" },
  { id: "preview", label: "Revisa" },
  { id: "done", label: "Listo" },
];

const NEW_TYPE_OPTIONS: SelectOption<NewType>[] = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
];

const PAGE = 150;

/**
 * Smart spreadsheet import. Upload any Excel/CSV, then work on a live, editable preview:
 * re-map or rename columns, turn unknown headers into new columns, fix cells in place,
 * drop rows, and jump straight to every problem — before a single row is saved.
 */
export function SmartImportWizard({
  open,
  onClose,
  title,
  entityLabel,
  targetFields,
  allowNewColumns = true,
  mappingExtra,
  blockReason,
  uploadHint,
  onImport,
  onFinished,
}: SmartImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [data, setData] = useState<string[][]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [mapping, setMapping] = useState<MappingSuggestion[]>([]);
  const [newLabels, setNewLabels] = useState<Record<number, string>>({});
  const [newTypes, setNewTypes] = useState<Record<number, NewType>>({});
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "errors" | "edited">("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [readError, setReadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [onlyValid, setOnlyValid] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setSheet(null);
    setData([]);
    setRemoved(new Set());
    setEdited(new Set());
    setMapping([]);
    setNewLabels({});
    setNewTypes({});
    setEditing(null);
    setRenaming(null);
    setFilter("all");
    setQuery("");
    setLimit(PAGE);
    setReadError(null);
    setResult(null);
    setImportError(null);
  };

  const close = () => {
    if (importing) return;
    if (step === "done") onFinished?.();
    reset();
    onClose();
  };

  const handleFile = async (f: File) => {
    setReading(true);
    setReadError(null);
    try {
      const parsed = await readSpreadsheet(f);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setReadError("No encontramos filas con datos en el archivo.");
        return;
      }
      setFile(f);
      setSheet(parsed);
      setData(parsed.rows.map((r) => [...r]));
      setMapping(autoMap(parsed.headers, targetFields, allowNewColumns));
      setNewLabels(Object.fromEntries(parsed.headers.map((h, i) => [i, h])));
      setStep("preview");
    } catch {
      setReadError("No pudimos leer el archivo. Usa un Excel (.xlsx o .xls) o un archivo .csv.");
    } finally {
      setReading(false);
    }
  };

  const fieldByKey = useMemo(() => new Map(targetFields.map((t) => [t.key, t])), [targetFields]);
  const headers = sheet?.headers ?? [];

  const targetOptions = (colIndex: number): SelectOption[] => {
    const takenByOthers = new Set(mapping.filter((_, j) => j !== colIndex).map((m) => m.target));
    const builtin = targetFields.filter((t) => !t.key.startsWith("custom:"));
    const custom = targetFields.filter((t) => t.key.startsWith("custom:"));
    return [
      ...builtin.map((t) => ({
        value: t.key,
        label: t.label + (t.required ? " *" : ""),
        description: t.hint,
        group: "Datos principales",
        disabled: takenByOthers.has(t.key),
      })),
      ...custom.map((t) => ({ value: t.key, label: t.label, group: "Columnas propias", disabled: takenByOthers.has(t.key) })),
      ...(allowNewColumns
        ? [{ value: NEW_COLUMN, label: "Guardar como columna propia", group: "Otras opciones", icon: <Plus className="h-3.5 w-3.5 text-primary" /> }]
        : []),
      { value: IGNORE, label: "No cargar esta columna", group: "Otras opciones", icon: <EyeOff className="h-3.5 w-3.5 text-text-muted" /> },
    ];
  };

  const mappedTargets = new Set(mapping.map((m) => m.target));
  const missingRequired = targetFields.filter((t) => t.required && !mappedTargets.has(t.key));
  const newColumnIdx = mapping.map((m, i) => (m.target === NEW_COLUMN ? i : -1)).filter((i) => i >= 0);

  const newColumns: NewCustomColumn[] = useMemo(
    () =>
      newColumnIdx.map((i) => {
        const label = (newLabels[i] ?? headers[i] ?? "").trim() || `Columna ${i + 1}`;
        return { key: slugify(label), label, field_type: newTypes[i] ?? inferType(data.map((r) => r[i] ?? "")) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapping, newLabels, newTypes, data, headers],
  );

  // Normalize every row against the current mapping; errors are tracked per cell.
  const built = useMemo<Built[]>(() => {
    return data.map((raw, r) => {
      const values: Record<string, string> = {};
      const custom: Record<string, string> = {};
      const cells: Cell[] = [];
      const errors: string[] = [];
      mapping.forEach((m, i) => {
        const rawValue = (raw[i] ?? "").trim();
        cells[i] = { value: rawValue, bad: false };
        if (m.target === IGNORE) return;

        let type: "text" | "number" | "integer" | "date" = "text";
        let label = headers[i] ?? "";
        let required = false;
        if (m.target === NEW_COLUMN) {
          const col = newColumns[newColumnIdx.indexOf(i)];
          type = col?.field_type ?? "text";
          label = col?.label ?? label;
        } else {
          const field = fieldByKey.get(m.target);
          if (!field) return;
          type = field.type ?? "text";
          label = field.label;
          required = !!field.required;
        }

        let value = rawValue;
        let msg: string | undefined;
        if (rawValue && (type === "number" || type === "integer")) {
          const n = parseNumber(rawValue);
          if (n === null || (type === "integer" && !Number.isInteger(n))) msg = `${label}: “${rawValue}” no es un número válido`;
          else value = String(n);
        } else if (rawValue && type === "date") {
          const d = parseDate(rawValue);
          if (!d) msg = `${label}: “${rawValue}” no es una fecha válida`;
          else value = d;
        }
        if (required && !rawValue) msg = `${label} está vacío`;
        if (msg) {
          errors.push(msg);
          cells[i] = { value: rawValue, bad: true, msg };
        }
        if (!value || msg) return;
        if (m.target === NEW_COLUMN) {
          const col = newColumns[newColumnIdx.indexOf(i)];
          if (col) custom[col.key] = value;
        } else if (m.target.startsWith("custom:")) custom[m.target.slice(7)] = value;
        else values[m.target] = value;
      });
      for (const t of missingRequired) errors.push(`Falta la columna ${t.label}`);
      return { index: r, row: { rowNumber: r + 1, values, custom }, errors, cells };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mapping, newColumns, fieldByKey, headers]);

  const active = built.filter((b) => !removed.has(b.index));
  const validCount = active.filter((b) => b.errors.length === 0).length;
  const invalidCount = active.length - validCount;
  const rowsEdited = new Set([...edited].map((k) => Number(k.split(":")[0])));

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return active.filter((b) => {
      if (filter === "errors" && b.errors.length === 0) return false;
      if (filter === "edited" && !rowsEdited.has(b.index)) return false;
      if (q && !b.cells.some((c) => c?.value.toLowerCase().includes(q))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, removed, filter, query, edited]);

  const problems = useMemo(() => {
    const out: { r: number; c: number; msg: string }[] = [];
    for (const b of active) {
      b.cells.forEach((cell, c) => {
        if (cell?.bad && cell.msg) out.push({ r: b.index, c, msg: cell.msg });
      });
      if (out.length >= 40) break;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, removed]);

  // ─── Editing ───────────────────────────────────────────────────────────────
  const startEdit = (r: number, c: number) => {
    if (mapping[c]?.target === IGNORE) return;
    setEditing({ r, c });
    setDraft(data[r]?.[c] ?? "");
  };

  const commit = (move?: "down" | "right") => {
    if (!editing) return;
    const { r, c } = editing;
    if ((data[r]?.[c] ?? "") !== draft) {
      setData((prev) => prev.map((row, i) => (i === r ? row.map((v, j) => (j === c ? draft : v)) : row)));
      setEdited((prev) => new Set(prev).add(`${r}:${c}`));
    }
    if (!move) return setEditing(null);
    const pos = visibleRows.findIndex((b) => b.index === r);
    if (move === "down") {
      const next = visibleRows[pos + 1];
      if (next) startEdit(next.index, c);
      else setEditing(null);
    } else {
      let nc = c + 1;
      while (nc < headers.length && mapping[nc]?.target === IGNORE) nc++;
      if (nc < headers.length) startEdit(r, nc);
      else setEditing(null);
    }
  };

  const jumpTo = (r: number, c: number) => {
    setFilter("all");
    setQuery("");
    const pos = active.findIndex((b) => b.index === r);
    if (pos >= limit) setLimit(Math.ceil((pos + 1) / PAGE) * PAGE);
    startEdit(r, c);
  };

  useEffect(() => {
    if (!editing) return;
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${editing.r}:${editing.c}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [editing]);

  const restore = () => {
    if (!sheet) return;
    setData(sheet.rows.map((r) => [...r]));
    setRemoved(new Set());
    setEdited(new Set());
    setEditing(null);
  };

  const runImport = async () => {
    const rows = active.filter((b) => !onlyValid || b.errors.length === 0).map((b) => b.row);
    if (rows.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await onImport(rows, newColumns);
      setResult(res);
      setStep("done");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "No se pudo terminar de cargar tu archivo. Inténtalo de nuevo.");
    } finally {
      setImporting(false);
    }
  };

  const importCount = onlyValid ? validCount : active.length;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const reason = blockReason ?? (missingRequired.length ? `Te falta indicar: ${missingRequired.map((t) => t.label).join(", ")}` : null);

  const footer = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="min-w-0 truncate text-xs text-text-muted">
        {file && step !== "upload" && (
          <span className="inline-flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> {file.name} · {sheet?.rows.length} filas
            {sheet?.sheetName && ` · hoja ${sheet.sheetName}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {step === "preview" && (
          <>
            <Button variant="ghost" onClick={reset} disabled={importing}>Cambiar archivo</Button>
            <Button onClick={runImport} disabled={importing || !!reason || importCount === 0} title={reason ?? undefined}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Importar {importCount} {entityLabel}
            </Button>
          </>
        )}
        {step === "done" && <Button onClick={close}>Listo</Button>}
        {step === "upload" && <Button variant="ghost" onClick={close}>Cancelar</Button>}
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={close} title={title} size={step === "preview" ? "full" : "xl"} footer={footer}>
      {/* Stepper */}
      <ol className="mb-5 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                i < stepIndex && "bg-primary text-on-primary",
                i === stepIndex && "bg-primary-soft text-primary ring-2 ring-primary/30",
                i > stepIndex && "bg-surface-muted text-text-muted",
              )}
            >
              {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("whitespace-nowrap text-sm font-medium", i === stepIndex ? "text-text-primary" : "text-text-muted")}>{s.label}</span>
            {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < stepIndex ? "bg-primary/40" : "bg-border")} />}
          </li>
        ))}
      </ol>

      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all",
              dragOver ? "scale-[1.01] border-primary bg-primary-softer" : "border-border bg-surface-soft hover:border-primary/40",
            )}
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:-translate-y-1">
              {reading ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
            </div>
            <div>
              <p className="font-display text-base font-semibold text-text-primary">{reading ? "Leyendo tu archivo…" : "Arrastra tu Excel o CSV aquí"}</p>
              <p className="mt-1 text-sm text-text-secondary">
                o haz clic para elegirlo. Antes de guardar podrás revisar y corregir todo.
              </p>
            </div>
            <div className="flex gap-1.5">
              {["Excel", "CSV"].map((t) => (
                <span key={t} className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-bold text-text-muted ring-1 ring-border">{t}</span>
              ))}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls,.xlsm,.ods"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <ol className="grid gap-2 sm:grid-cols-3">
            {[
              { icon: Wand2, t: "Entendemos tu Excel", d: "No importa el orden ni cómo se llamen tus columnas." },
              { icon: Pencil, t: "Revisa antes de guardar", d: "Puedes corregir cualquier dato o quitar columnas." },
              { icon: CheckCircle2, t: "Se carga lo que está bien", d: "Si una fila tiene un error, las demás igual se cargan." },
            ].map((s, i) => (
              <li key={s.t} className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><s.icon className="h-3.5 w-3.5" /></span>
                <span>
                  <span className="block text-[13px] font-semibold text-text-primary">{i + 1}. {s.t}</span>
                  <span className="block text-xs text-text-secondary">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
          {readError && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{readError}</div>}
          {uploadHint && <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">{uploadHint}</div>}
        </div>
      )}

      {step === "preview" && sheet && (
        <div className="space-y-3">
          {/* Status + filters */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} tone="success" icon={CheckCircle2} label="Bien" value={validCount} />
            <FilterChip active={filter === "errors"} onClick={() => setFilter("errors")} tone={invalidCount ? "danger" : "muted"} icon={AlertTriangle} label="Con errores" value={invalidCount} />
            <FilterChip active={filter === "edited"} onClick={() => setFilter("edited")} tone="primary" icon={Pencil} label="Editadas" value={rowsEdited.size} />
            {newColumns.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-violet/25 bg-accent-violet-soft px-3 py-1 text-xs font-semibold text-accent-violet">
                <Columns3 className="h-3.5 w-3.5" /> {newColumns.length} columna(s) nueva(s)
              </span>
            )}
            {removed.size > 0 && <span className="text-xs text-text-muted">{removed.size} fila(s) quitadas</span>}
            <div className="ml-auto flex items-center gap-2">
              {(edited.size > 0 || removed.size > 0) && (
                <button type="button" onClick={restore} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-soft hover:text-text-primary">
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar original
                </button>
              )}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar en el archivo"
                  className="h-8 w-48 rounded-lg border border-border bg-surface-soft pl-8 pr-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {(missingRequired.length > 0 || blockReason) && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {missingRequired.length > 0 && (
                <span>
                  Dinos en qué columna está {missingRequired.map((t) => <strong key={t.key} className="mx-0.5">{t.label}</strong>)}: elígelo arriba, en el título de esa columna.
                </span>
              )}
              {blockReason && <span>{blockReason}</span>}
            </div>
          )}

          {mappingExtra && <div className="grid gap-3 md:grid-cols-2">{mappingExtra}</div>}

          <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5 text-primary" /> Toca una celda para corregirla
            </span>
            {invalidCount > 0 && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-text-secondary">
                <input type="checkbox" checked={onlyValid} onChange={(e) => setOnlyValid(e.target.checked)} className="accent-[rgb(var(--c-primary))]" />
                Saltar las filas con errores
              </label>
            )}
          </div>

          {importError && <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">{importError}</div>}

          {/* The editable grid */}
          <div ref={gridRef} className="max-h-[52vh] overflow-x-auto overflow-y-auto rounded-2xl border border-border bg-surface">
            {/* w-max: columns keep their natural width (no wrapping) and the grid scrolls sideways. */}
            <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 w-12 border-b border-r border-border bg-surface-soft px-2 py-2 text-[10px] font-semibold uppercase text-text-muted">#</th>
                  {headers.map((header, i) => {
                    const m = mapping[i];
                    const ignored = m?.target === IGNORE;
                    const isNew = m?.target === NEW_COLUMN;
                    return (
                      <th
                        key={i}
                        className={cn(
                          "min-w-[200px] whitespace-nowrap border-b border-r border-border bg-surface-soft px-2.5 py-2 align-top font-normal last:border-r-0",
                          isNew && "bg-accent-violet-soft/60",
                          ignored && "bg-surface-muted/80",
                        )}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-1.5">
                          <span className={cn("truncate text-[10.5px] font-semibold uppercase tracking-wider", ignored ? "text-text-muted line-through" : "text-text-muted")} title={header}>
                            {header}
                          </span>
                          {m?.confidence && !ignored && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-1.5 text-[9.5px] font-bold",
                                m.confidence === "alta" ? "bg-success-soft text-success" : m.confidence === "media" ? "bg-primary-soft text-primary" : "bg-warning-soft text-warning",
                              )}
                            >
                              {m.confidence === "alta" ? "Lo reconocimos" : m.confidence === "media" ? "Creemos que es" : "Revísalo"}
                            </span>
                          )}
                        </div>
                        <Select
                          size="sm"
                          value={m?.target ?? IGNORE}
                          options={targetOptions(i)}
                          searchable
                          onChange={(target) => setMapping((prev) => prev.map((x, j) => (j === i ? { target, confidence: null } : x)))}
                        />
                        {isNew && (
                          <div className="mt-1.5 grid grid-cols-[1fr_88px] gap-1.5">
                            {renaming === i ? (
                              <input
                                autoFocus
                                value={newLabels[i] ?? header}
                                onChange={(e) => setNewLabels((p) => ({ ...p, [i]: e.target.value }))}
                                onBlur={() => setRenaming(null)}
                                onKeyDown={(e) => e.key === "Enter" && setRenaming(null)}
                                className="h-8 min-w-0 rounded-lg border border-accent-violet/40 bg-surface px-2 text-xs text-text-primary focus:outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRenaming(i)}
                                title="Cambiar el nombre de la columna"
                                className="flex h-8 min-w-0 items-center gap-1 rounded-lg border border-accent-violet/25 bg-surface px-2 text-left text-xs font-medium text-accent-violet hover:border-accent-violet/50"
                              >
                                <Pencil className="h-3 w-3 shrink-0" />
                                <span className="truncate">{(newLabels[i] ?? header) || "Sin nombre"}</span>
                              </button>
                            )}
                            <Select
                              size="sm"
                              value={newTypes[i] ?? newColumns[newColumnIdx.indexOf(i)]?.field_type ?? "text"}
                              options={NEW_TYPE_OPTIONS}
                              onChange={(v) => setNewTypes((p) => ({ ...p, [i]: v }))}
                            />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, limit).map((b) => {
                  const hasErr = b.errors.length > 0;
                  return (
                    <tr key={b.index} className="group">
                      <td
                        className={cn(
                          "sticky left-0 z-[5] border-b border-r border-border-soft px-1.5 py-1.5 text-center text-[11px] tabular-nums",
                          hasErr ? "bg-danger-soft text-danger" : "bg-surface text-text-muted",
                        )}
                        title={b.errors.join("\n")}
                      >
                        <span className="group-hover:hidden">{hasErr ? <AlertTriangle className="mx-auto h-3.5 w-3.5" /> : b.row.rowNumber}</span>
                        <button
                          type="button"
                          onClick={() => setRemoved((prev) => new Set(prev).add(b.index))}
                          className="mx-auto hidden text-text-muted hover:text-danger group-hover:block"
                          aria-label={`Quitar fila ${b.row.rowNumber}`}
                          title="Quitar esta fila"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                      {headers.map((_, c) => {
                        const cell = b.cells[c];
                        const ignored = mapping[c]?.target === IGNORE;
                        const isEditing = editing?.r === b.index && editing.c === c;
                        const wasEdited = edited.has(`${b.index}:${c}`);
                        return (
                          <td
                            key={c}
                            data-cell={`${b.index}:${c}`}
                            onClick={() => !isEditing && startEdit(b.index, c)}
                            title={cell?.msg}
                            className={cn(
                              "relative whitespace-nowrap border-b border-r border-border-soft px-2.5 py-1.5 last:border-r-0",
                              ignored ? "cursor-default bg-surface-muted/40 text-text-muted/60" : "cursor-text hover:bg-primary-softer/50",
                              cell?.bad && "bg-danger-soft/50 text-danger",
                              wasEdited && !cell?.bad && "bg-primary-softer/60",
                              isEditing && "p-0",
                            )}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={() => commit()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    commit("down");
                                  } else if (e.key === "Tab") {
                                    e.preventDefault();
                                    commit("right");
                                  } else if (e.key === "Escape") {
                                    e.stopPropagation();
                                    setEditing(null);
                                  }
                                }}
                                className="h-full w-full min-w-[160px] bg-surface px-2.5 py-1.5 text-sm text-text-primary shadow-[inset_0_0_0_2px_rgb(var(--c-primary))] focus:outline-none"
                              />
                            ) : (
                              <span className="block whitespace-nowrap">
                                {cell?.value || <span className="text-text-muted/50">—</span>}
                              </span>
                            )}
                            {wasEdited && !isEditing && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={headers.length + 1} className="px-6 py-12 text-center text-sm text-text-muted">
                      {filter === "errors" ? "¡Sin errores! Todo listo para cargar." : "No hay filas aquí."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
            <span>Mostrando {Math.min(limit, visibleRows.length)} de {visibleRows.length} filas</span>
            {visibleRows.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="font-semibold text-primary hover:underline">
                Mostrar {Math.min(PAGE, visibleRows.length - limit)} más
              </button>
            )}
          </div>

          {problems.length > 0 && (
            <div className="rounded-2xl border border-danger/20 bg-danger-soft/30 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
                <XCircle className="h-3.5 w-3.5" /> Problemas por corregir {invalidCount > problems.length ? `(primeros ${problems.length})` : ""}
              </p>
              <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                {problems.map((p) => (
                  <button
                    key={`${p.r}:${p.c}`}
                    type="button"
                    onClick={() => jumpTo(p.r, p.c)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-danger/20 bg-surface px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-danger/50 hover:text-text-primary"
                  >
                    <span className="font-semibold tabular-nums text-danger">Fila {p.r + 1}</span>
                    <span className="max-w-[260px] truncate">{p.msg}</span>
                    <ArrowRight className="h-3 w-3 text-danger" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-5 py-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid h-16 w-16 animate-scale-in place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="font-display text-xl font-bold text-text-primary">¡Listo! Ya cargamos tu archivo</p>
            <p className="text-sm text-text-secondary">
              {result.created} {entityLabel} creados
              {result.updated ? ` · ${result.updated} actualizados` : ""}
              {result.skipped ? ` · ${result.skipped} saltados` : ""}
            </p>
          </div>
          {result.notes?.map((n) => (
            <p key={n} className="text-center text-sm text-text-secondary">{n}</p>
          ))}
          {result.errors.length > 0 && (
            <div className="rounded-2xl border border-danger/25 bg-danger-soft/40 p-4">
              <p className="mb-2 text-sm font-semibold text-danger">{result.errors.length} filas no se pudieron cargar</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-text-secondary">
                {result.errors.map((e, i) => (
                  <li key={i}>Fila {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function FilterChip({
  active,
  onClick,
  tone,
  icon: Icon,
  label,
  value,
}: {
  active: boolean;
  onClick: () => void;
  tone: "success" | "danger" | "primary" | "muted";
  icon: typeof CheckCircle2;
  label: string;
  value: number;
}) {
  const tones = {
    success: "text-success",
    danger: "text-danger",
    primary: "text-primary",
    muted: "text-text-muted",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
        active ? "border-primary/30 bg-surface shadow-soft" : "border-border bg-surface-soft hover:bg-surface",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", tones[tone])} />
      <span className="text-text-secondary">{label}</span>
      <span className={cn("tabular-nums", tones[tone])}>{value}</span>
    </button>
  );
}
