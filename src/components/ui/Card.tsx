import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle lift + border highlight on hover. */
  interactive?: boolean;
}

export function Card({ className, children, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-3xl shadow-soft border border-border p-6 transition-all duration-200",
        interactive && "hover:shadow-soft-lg hover:border-primary/20 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
