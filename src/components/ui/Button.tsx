import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "violet" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  violet: "btn-violet",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
};

// `.btn` provides layout, radius and motion; sizes only add padding / text / gap.
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-2xl",
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn("btn", variants[variant], sizes[size], "disabled:pointer-events-none disabled:opacity-50", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
