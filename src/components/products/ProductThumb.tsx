/* eslint-disable @next/next/no-img-element */
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "h-8 w-8 rounded-lg",
  sm: "h-10 w-10 rounded-xl",
  md: "h-14 w-14 rounded-2xl",
  lg: "h-24 w-24 rounded-2xl",
} as const;

/** Product photo, or a soft placeholder with the product initial. */
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
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn("shrink-0 border border-border bg-surface object-cover", sizes[size], className)}
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center border border-border-soft bg-primary-softer text-primary",
        sizes[size],
        className,
      )}
    >
      {initial ? (
        <span className={cn("font-display font-semibold", size === "lg" ? "text-3xl" : size === "md" ? "text-lg" : "text-sm")}>
          {initial}
        </span>
      ) : (
        <Package className="h-4 w-4" />
      )}
    </span>
  );
}
