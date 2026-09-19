"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMode, setModePref } from "@/lib/appearance";

/** Light/dark switch with a rotating sun ⇄ moon. Persisted; works with or without the app shell. */
export function ModeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.getAttribute("data-mode") === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["data-mode"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => setModePref(resolveMode(dark ? "light" : "dark"));

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={dark ? "Modo claro" : "Modo oscuro"}
      className={cn(
        "relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl text-text-secondary transition-colors hover:bg-surface-muted/80 hover:text-text-primary",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-500 [transition-timing-function:var(--ease-spring)]",
          dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute h-[18px] w-[18px] transition-all duration-500 [transition-timing-function:var(--ease-spring)]",
          dark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
    </button>
  );
}
