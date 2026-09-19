import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional small eyebrow label shown above the title. */
  eyebrow?: string;
  /** "violet" marks a Motor FTGM screen, keeping its color consistent with the sidebar. */
  eyebrowTone?: "primary" | "violet";
}

export function PageHeader({ title, description, action, eyebrow, eyebrowTone = "primary" }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div
            className={cn(
              "badge mb-3.5 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]",
              eyebrowTone === "violet" ? "bg-accent-violet-soft/70 text-accent-violet" : "bg-primary-softer text-primary",
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
            {eyebrow}
          </div>
        )}
        <h1 className="page-title font-display text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-text-primary sm:text-[34px]">
          {title}
        </h1>
        {description && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-text-secondary">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
