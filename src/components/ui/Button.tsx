import { cn } from "@/lib/utils";

type Variant = "primary" | "violet" | "secondary" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  violet: "btn-violet",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
};

// `.btn` provides layout + radius; sizes only add padding / text / gap.
const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2",
};

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button className={cn("btn", variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
