"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Underlined tab bar with an indicator that glides between tabs. Controlled. */
export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ left: 0, width: 0 });
  const signature = tabs.map((t) => `${t.id}:${t.label}:${t.count ?? ""}`).join("|");

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
      if (!el) return;
      setBar((b) => (b.left === el.offsetLeft && b.width === el.offsetWidth ? b : { left: el.offsetLeft, width: el.offsetWidth }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [value, signature]);

  return (
    <div ref={listRef} className={cn("relative flex items-center gap-1 border-b border-border", className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            data-tab={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex items-center px-4 py-3 text-sm font-medium transition-colors",
              active ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition-colors",
                  active ? "bg-primary-soft text-primary" : "bg-surface-muted text-text-muted",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
      <span
        aria-hidden
        className="absolute -bottom-px h-[2px] rounded-full bg-primary shadow-[0_0_12px_rgb(var(--c-glow)/0.6)] transition-[left,width] duration-300 [transition-timing-function:var(--ease-out)]"
        style={{ left: bar.left, width: bar.width }}
      />
    </div>
  );
}
