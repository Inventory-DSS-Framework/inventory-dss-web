"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { Camera, Loader2, ScanLine, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { soles } from "@/lib/ui";
import { posApi } from "@/lib/apis/pos";
import { ApiError } from "@/lib/api-client";
import type { CatalogProduct } from "@/types/pos";
import { ProductThumb } from "./ProductThumb";
import { StockBadge } from "./StockBadge";

interface Props {
  companyId: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (product: CatalogProduct) => void;
  onOpenCamera: () => void;
}

/**
 * The till's main input. Barcode scanners "type" the code and press Enter, so Enter
 * first tries an exact barcode/SKU lookup; typing a name shows a live results list.
 */
export function ProductSearch({ companyId, inputRef, onPick, onOpenCamera }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!companyId) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const id = ++seq.current;
    setSearching(true);
    const t = window.setTimeout(() => {
      posApi
        .catalog(companyId, term, 8)
        .then((rows) => {
          if (id !== seq.current) return;
          setResults(rows);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => id === seq.current && setResults([]))
        .finally(() => id === seq.current && setSearching(false));
    }, 180);
    return () => window.clearTimeout(t);
  }, [query, companyId]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const reset = () => {
    seq.current++;
    setQuery("");
    setResults([]);
    setOpen(false);
    setActive(-1);
    setSearching(false);
  };

  const pick = (p: CatalogProduct) => {
    onPick(p);
    setNotFound(null);
    reset();
    inputRef.current?.focus();
  };

  const submit = async () => {
    const code = query.trim();
    if (!code || !companyId) return;
    if (active >= 0 && results[active]) return pick(results[active]);
    try {
      const product = await posApi.lookup(companyId, code);
      pick(product);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        if (results.length === 1) return pick(results[0]);
        if (results.length > 1) {
          setOpen(true);
          setNotFound(null);
          return;
        }
        setNotFound(code);
        reset();
      } else {
        setNotFound(null);
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      reset();
      setNotFound(null);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-stretch gap-2.5">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNotFound(null);
            }}
            onFocus={() => results.length && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Escanea o escribe el nombre o código"
            aria-label="Buscar producto"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full rounded-2xl border border-border bg-surface pl-12 pr-24 text-base text-text-primary shadow-soft placeholder:text-text-muted transition-all focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {searching && <Loader2 className="h-4 w-4 animate-spin text-text-muted" />}
            <kbd className="rounded-md border border-border bg-surface-soft px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">F2</kbd>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCamera}
          className="btn btn-secondary h-14 shrink-0 gap-2 rounded-2xl px-4 text-sm"
          title="Escanear con cámara"
        >
          <Camera className="h-5 w-5" />
          <span className="hidden sm:inline">Escanear con cámara</span>
        </button>
      </div>

      {notFound && (
        <p className="mt-2 flex items-center gap-2 text-sm text-danger animate-fade-up">
          <SearchX className="h-4 w-4" /> No encontramos un producto con «{notFound}».
        </p>
      )}

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft-xl animate-fade-up">
          {results.length === 0 && !searching ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">Sin coincidencias para «{query.trim()}»</p>
          ) : (
            <ul role="listbox" className="max-h-[360px] overflow-y-auto p-1.5">
              {results.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(p)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                      i === active ? "bg-primary-softer" : "hover:bg-surface-soft",
                    )}
                  >
                    <ProductThumb src={p.image_url} name={p.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">{p.name}</span>
                      <span className="block truncate font-mono text-[11px] text-text-muted">
                        {p.sku}
                        {p.barcode ? ` · ${p.barcode}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums text-text-primary">{soles(p.unit_price)}</span>
                      <StockBadge stock={p.stock_on_hand} reorderPoint={p.reorder_point} compact />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
