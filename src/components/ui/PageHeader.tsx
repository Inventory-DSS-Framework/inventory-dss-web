import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional small eyebrow label shown above the title. */
  eyebrow?: string;
}

export function PageHeader({ title, description, action, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] leading-tight font-bold tracking-tight text-text-primary">{title}</h1>
        {description && <p className="text-sm text-text-secondary mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
