"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = { id: string; label: string; from: string; to: string };

// Two-tone preview swatch per theme (primary + secondary accent).
const THEMES: Theme[] = [
  { id: "teal-coral", label: "Teal y coral", from: "#0FB3A6", to: "#FB7A5B" },
  { id: "turquoise", label: "Turquesa moderno", from: "#0FB3A6", to: "#0A6E66" },
  { id: "warm", label: "Naranja cálido", from: "#F2784B", to: "#C4502A" },
  { id: "indigo", label: "Índigo refinado", from: "#4F46E5", to: "#F4A259" },
];

export function ThemeSwitcher() {
  const [active, setActive] = useState<string>("teal-coral");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current) setActive(current);
  }, []);

  const pick = (id: string) => {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("dss-theme", id);
    } catch {
      /* ignore storage errors */
    }
    setActive(id);
  };

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Tema de color">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => pick(t.id)}
          title={t.label}
          aria-label={t.label}
          aria-pressed={active === t.id}
          className={cn(
            "w-6 h-6 rounded-full transition-all duration-150",
            active === t.id
              ? "ring-2 ring-primary ring-offset-2 ring-offset-surface scale-105"
              : "opacity-75 hover:opacity-100 hover:scale-105"
          )}
        >
          <span
            className="block w-full h-full rounded-full"
            style={{ background: `linear-gradient(135deg, ${t.from} 0 50%, ${t.to} 50% 100%)` }}
          />
        </button>
      ))}
    </div>
  );
}
