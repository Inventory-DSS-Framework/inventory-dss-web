"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Toggles light/dark mode (combines with the active color theme). Persisted. */
export function ModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-mode") === "dark");
  }, []);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", next);
    try {
      localStorage.setItem("dss-mode", next);
    } catch {
      /* ignore storage errors */
    }
    setDark(!dark);
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={dark ? "Modo claro" : "Modo oscuro"}
      className="p-2.5 rounded-xl text-text-secondary hover:bg-surface-soft hover:text-text-primary transition-colors"
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
