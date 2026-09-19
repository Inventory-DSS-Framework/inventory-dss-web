/**
 * Spreadsheet parsing + header auto-mapping for smart imports.
 *
 * Accepts CSV/TXT (any delimiter, UTF-8 or Windows-1252 as exported by Excel in
 * Spanish locales) and XLSX/XLS/ODS. Finds the real header row even when the file has
 * a title block above it, and suggests which of our fields each column feeds.
 */

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
  sheetName?: string;
}

export type ImportFieldType = "text" | "number" | "integer" | "date";

export interface ImportTargetField {
  key: string;
  label: string;
  required?: boolean;
  /** Other header spellings that should map here ("cant", "qty", "unidades"...). */
  synonyms?: string[];
  type?: ImportFieldType;
  hint?: string;
}

export const IGNORE = "__ignore";
export const NEW_COLUMN = "__new";

/** Same algorithm as the backend's custom_fields.slugify — keys must match. */
export function slugify(label: string): string {
  const ascii = label.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  const slug = ascii.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return (slug || "campo").slice(0, 60);
}

export function normalizeHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ─── Reading ────────────────────────────────────────────────────────────────

export async function readSpreadsheet(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  let matrix: string[][];
  let sheetName: string | undefined;

  if (/\.(xlsx|xlsm|xls|ods)$/.test(name)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    sheetName = wb.SheetNames[0];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" });
    matrix = raw.map((r) => r.map(cellToString));
  } else {
    const buf = await file.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf);
    matrix = parseDelimited(text.replace(/^﻿/, ""));
  }

  matrix = matrix.filter((r) => r.some((c) => c.trim() !== ""));
  if (matrix.length === 0) return { headers: [], rows: [], sheetName };

  const headerIdx = detectHeaderRow(matrix);
  const width = Math.max(...matrix.slice(headerIdx).map((r) => r.length));
  const headers = Array.from({ length: width }, (_, i) => (matrix[headerIdx][i] ?? "").trim() || `Columna ${i + 1}`);
  // Drop columns that are empty in the header AND every row.
  const keep = headers.map((h, i) => !h.startsWith("Columna ") || matrix.slice(headerIdx + 1).some((r) => (r[i] ?? "").trim()));
  const rows = matrix
    .slice(headerIdx + 1)
    .map((r) => headers.map((_, i) => (r[i] ?? "").trim()).filter((_, i) => keep[i]));
  return { headers: headers.filter((_, i) => keep[i]), rows, sheetName };
}

function cellToString(v: unknown): string {
  if (v instanceof Date) {
    const d = new Date(v.getTime() - v.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  return v == null ? "" : String(v).trim();
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 8);
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = -1;
  for (const d of candidates) {
    const counts = sample.map((line) => line.split(d).length - 1).filter((c) => c > 0);
    if (counts.length === 0) continue;
    // Prefer delimiters that appear consistently across lines.
    const consistency = counts.filter((c) => c === counts[0]).length;
    const score = consistency * 10 + counts[0];
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

export function parseDelimited(text: string): string[][] {
  const delim = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim()));
}

/** The header is the first row that is "wide" and mostly non-numeric text. */
function detectHeaderRow(matrix: string[][]): number {
  const maxWidth = Math.max(...matrix.slice(0, 15).map((r) => r.filter((c) => c).length));
  for (let i = 0; i < Math.min(10, matrix.length); i++) {
    const filled = matrix[i].filter((c) => c.trim());
    const textual = filled.filter((c) => parseNumber(c) === null).length;
    if (filled.length >= Math.max(2, Math.ceil(maxWidth * 0.6)) && textual >= filled.length * 0.6) return i;
  }
  return 0;
}

// ─── Value parsing ──────────────────────────────────────────────────────────

/** "S/ 1.234,50", "1,234.50", "12,5", "$99" → number. Null when it isn't a number. */
export function parseNumber(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  let s = input.trim().replace(/^(s\/\.?|pen|usd|us\$|\$)\s*/i, "").replace(/\s/g, "");
  if (!s || !/^-?[\d.,]+$/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** ISO yyyy-mm-dd, dd/mm/yyyy (Peru), dd-mm-yy, Excel serial → "yyyy-mm-dd". */
export function parseDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    let day = +m[1];
    let month = +m[2];
    if (month > 12 && day <= 12) [day, month] = [month, day];
    return iso(year, month, day);
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function iso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Guess a column's type from sample values (for auto-created custom columns). */
export function inferType(values: string[]): "text" | "number" | "date" {
  const filled = values.filter((v) => v.trim()).slice(0, 30);
  if (filled.length === 0) return "text";
  if (filled.every((v) => parseNumber(v) !== null)) return "number";
  if (filled.every((v) => parseDate(v) !== null)) return "date";
  return "text";
}

// ─── Auto-mapping ───────────────────────────────────────────────────────────

export interface MappingSuggestion {
  target: string; // field key, IGNORE or NEW_COLUMN
  confidence: "alta" | "media" | "baja" | null;
}

export function autoMap(
  headers: string[],
  targets: ImportTargetField[],
  allowNewColumns: boolean,
): MappingSuggestion[] {
  const scored: { h: number; key: string; score: number }[] = [];
  headers.forEach((header, h) => {
    const nh = normalizeHeader(header);
    if (!nh) return;
    targets.forEach((t) => {
      const names = [t.key.replace(/^custom:/, "").replace(/_/g, " "), t.label, ...(t.synonyms ?? [])].map(normalizeHeader);
      let score = 0;
      for (const n of names) {
        if (!n) continue;
        if (n === nh) score = Math.max(score, 100);
        else if (n.length >= 3 && (nh.includes(n) || n.includes(nh))) score = Math.max(score, 70);
        else {
          const a = new Set(nh.split(" "));
          const overlap = n.split(" ").filter((w) => w.length > 2 && a.has(w)).length;
          if (overlap) score = Math.max(score, 40 + overlap * 10);
        }
      }
      if (score > 0) scored.push({ h, key: t.key, score });
    });
  });

  scored.sort((a, b) => b.score - a.score);
  const result: MappingSuggestion[] = headers.map(() => ({
    target: allowNewColumns ? NEW_COLUMN : IGNORE,
    confidence: null,
  }));
  const usedHeaders = new Set<number>();
  const usedTargets = new Set<string>();
  for (const s of scored) {
    if (usedHeaders.has(s.h) || usedTargets.has(s.key) || s.score < 50) continue;
    usedHeaders.add(s.h);
    usedTargets.add(s.key);
    result[s.h] = { target: s.key, confidence: s.score >= 100 ? "alta" : s.score >= 70 ? "media" : "baja" };
  }
  return result;
}
