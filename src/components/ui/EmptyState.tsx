import { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Primary call to action pointing at the next step of the flow. */
  action?: { label: string; href?: string; onClick?: () => void };
  /** A small hint shown under the action (e.g. a prerequisite). */
  hint?: ReactNode;
  className?: string;
}

/**
 * A guided empty state: instead of a dead-end "No data", it names what the screen is
 * for and offers the next action in the flow. Used wherever a list can be empty.
 */
export function EmptyState({ icon: Icon, title, description, action, hint, className }: EmptyStateProps) {
  const actionClass = "btn btn-primary mt-2 h-10 gap-1.5 px-4 text-sm group";
  return (
    <Card className={className}>
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="relative grid h-16 w-16 place-items-center">
          <span className="absolute inset-0 rotate-[10deg] rounded-[1.1rem] bg-primary-soft" />
          <span className="absolute inset-0 -rotate-[4deg] rounded-[1.1rem] border border-primary/20 bg-surface shadow-soft" />
          <Icon className="relative h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="font-display text-lg font-semibold tracking-[-0.02em] text-text-primary">{title}</p>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-text-secondary">{description}</p>
        </div>
        {action &&
          (action.href ? (
            <Link href={action.href} className={actionClass}>
              {action.label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <button onClick={action.onClick} className={actionClass}>
              {action.label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        {hint && <p className="max-w-sm text-xs text-text-muted">{hint}</p>}
      </div>
    </Card>
  );
}
