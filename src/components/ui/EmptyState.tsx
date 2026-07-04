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
  return (
    <Card className={className}>
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-base font-semibold text-text-primary">{title}</p>
          <p className="mx-auto max-w-md text-sm text-text-secondary">{description}</p>
        </div>
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              {action.label} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
            >
              {action.label} <ArrowRight className="h-4 w-4" />
            </button>
          ))}
        {hint && <p className="max-w-sm text-xs text-text-muted">{hint}</p>}
      </div>
    </Card>
  );
}
