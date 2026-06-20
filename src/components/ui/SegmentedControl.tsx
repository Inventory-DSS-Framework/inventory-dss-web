"use client";

import { cn } from "@/lib/utils";

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full bg-surface border border-border p-1 shadow-soft", className)}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
              isActive
                ? "btn-primary"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
