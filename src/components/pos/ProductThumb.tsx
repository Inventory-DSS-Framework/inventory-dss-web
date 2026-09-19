import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "h-9 w-9 rounded-lg text-[11px]",
  sm: "h-11 w-11 rounded-xl text-xs",
  md: "h-16 w-16 rounded-2xl text-sm",
  lg: "h-full w-full rounded-2xl text-2xl",
} as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /[a-zA-ZÁÉÍÓÚÑáéíóúñ0-9]/.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Product photo, or a calm placeholder with the product's initials. */
export function ProductThumb({
  src,
  name,
  size = "sm",
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 border border-border-soft bg-surface-soft object-cover", sizes[size], className)}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center border border-border-soft bg-gradient-to-br from-primary-softer to-surface-muted font-display font-semibold text-primary",
        sizes[size],
        className,
      )}
    >
      {size === "lg" ? (
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <Package className="h-10 w-10 text-primary/60" strokeWidth={1.5} />
          <span className="text-sm font-medium">{initials(name) || "—"}</span>
        </div>
      ) : (
        initials(name) || <Package className="h-4 w-4" />
      )}
    </div>
  );
}
