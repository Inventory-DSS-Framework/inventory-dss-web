import { Calendar, ChevronDown } from "lucide-react";

interface DateRangePillProps {
  range?: string;
  preset?: string;
}

export function DateRangePill({
  range = "01 Jun 2026 – 30 Jun 2026",
  preset = "Últimos 30 días",
}: DateRangePillProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-surface border border-border p-1 shadow-soft">
      <button className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-soft transition-colors">
        <Calendar className="w-4 h-4 text-text-muted" />
        {range}
      </button>
      <span className="w-px h-5 bg-border" />
      <button className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-soft transition-colors">
        {preset}
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}
