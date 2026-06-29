"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Underlined tab bar. Controlled. */
export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border", className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2",
              active
                ? "border-primary text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  active ? "bg-primary-soft text-primary" : "bg-surface-muted text-text-muted",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
