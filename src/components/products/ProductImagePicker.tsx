/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "./image";

interface ProductImagePickerProps {
  value: string | null;
  onChange: (value: string | null) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}

/** Square photo slot: drop or pick an image, compressed in the browser before upload. */
export function ProductImagePicker({ value, onChange, className, disabled }: ProductImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onChange(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la imagen.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await onChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la imagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={value ? "Cambiar foto del producto" : "Subir foto del producto"}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) handle(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group relative aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border transition-all",
          value ? "border-border bg-surface" : "border-dashed border-border bg-surface-soft hover:border-primary/40",
          dragOver && "border-primary bg-primary-softer",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {value ? (
          <>
            <img src={value} alt="Foto del producto" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1.5 bg-text-primary/55 p-2 backdrop-blur-sm transition-transform group-hover:translate-y-0 group-focus-within:translate-y-0">
              <span className="inline-flex items-center gap-1 rounded-lg bg-surface/90 px-2 py-1 text-[11px] font-semibold text-text-primary">
                <RefreshCw className="h-3 w-3" /> Cambiar
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove();
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-surface/90 px-2 py-1 text-[11px] font-semibold text-danger hover:bg-surface"
              >
                <Trash2 className="h-3 w-3" /> Quitar
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold text-text-primary">Agregar foto</span>
            <span className="text-[10px] leading-tight text-text-muted">JPG, PNG o WEBP · la optimizamos por ti</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-surface/70 backdrop-blur-[2px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
