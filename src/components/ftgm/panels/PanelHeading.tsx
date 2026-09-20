"use client";

/** Section heading inside the /forecasting stepper (the panels have no page header of their own). */
export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-0.5 max-w-2xl text-sm text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
