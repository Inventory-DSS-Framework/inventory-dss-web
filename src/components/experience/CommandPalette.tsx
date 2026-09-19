"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass, Crown, CornerDownLeft, LogOut, Moon, PlayCircle, Search, type LucideIcon } from "lucide-react";
import { startGuidedTour } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { adminNav, sellerNav } from "@/components/layout/Sidebar";
import { useRole } from "@/hooks/useRole";
import { resolveMode, setModePref } from "@/lib/appearance";
import { logout } from "@/lib/auth";

type Command = { id: string; label: string; group: string; icon: LucideIcon; href?: string; run?: () => void };

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Fire from anywhere to open the palette. */
export const openCommandPalette = () => window.dispatchEvent(new Event("dss:command"));

/** ⌘K / Ctrl+K — jump to any module or run a quick action. */
export function CommandPalette() {
  const router = useRouter();
  const { isSeller } = useRole();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("dss:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dss:command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const nav = (isSeller ? sellerNav : adminNav).flatMap((g) =>
      g.items.map((i) => ({ id: i.href, label: i.name, group: g.label, icon: i.icon, href: i.href })),
    );
    const actions: Command[] = [
      {
        id: "mode",
        label: "Alternar modo claro / oscuro",
        group: "Acciones",
        icon: Moon,
        run: () => setModePref(resolveMode(document.documentElement.getAttribute("data-mode") === "dark" ? "light" : "dark")),
      },
      ...(isSeller
        ? []
        : [
            { id: "premium", label: "Ver plan Premium", group: "Acciones", icon: Crown, href: "/premium" },
            { id: "welcome", label: "Ver bienvenida y demo", group: "Ayuda", icon: PlayCircle, href: "/welcome?replay=1" },
            {
              id: "tour",
              label: "Iniciar recorrido guiado",
              group: "Ayuda",
              icon: Compass,
              run: () => {
                startGuidedTour();
                router.push("/dashboard");
              },
            },
          ]),
      { id: "logout", label: "Cerrar sesión", group: "Acciones", icon: LogOut, run: () => { logout(); router.push("/login"); } },
    ];
    return [...nav, ...actions];
  }, [isSeller, router]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return commands;
    return commands.filter((c) => normalize(`${c.label} ${c.group}`).includes(q));
  }, [commands, query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const execute = (c: Command | undefined) => {
    if (!c) return;
    setOpen(false);
    if (c.run) c.run();
    else if (c.href) router.push(c.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      execute(filtered[active]);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start justify-center px-4 pt-[14vh]" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="modal-overlay absolute inset-0 bg-[rgb(var(--shadow-color)/0.35)] backdrop-blur-md" onClick={() => setOpen(false)} />
      <div
        onKeyDown={onKeyDown}
        className="modal-panel relative w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-soft-xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-5">
          <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Busca un módulo o acción…"
            className="h-14 w-full bg-transparent text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="rounded-md border border-border bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] text-text-muted">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 && <p className="px-3 py-10 text-center text-sm text-text-muted">Sin resultados para “{query}”.</p>}
          {filtered.map((c, i) => {
            const showGroup = c.group !== filtered[i - 1]?.group;
            const Icon = c.icon;
            return (
              <div key={c.id}>
                {showGroup && (
                  <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{c.group}</p>
                )}
                <button
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => execute(c)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    i === active ? "bg-primary-soft text-text-primary" : "text-text-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors",
                      i === active ? "border-primary/25 bg-surface text-primary" : "border-border bg-surface-soft text-text-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 font-medium">{c.label}</span>
                  {i === active && <ArrowRight className="h-4 w-4 text-primary" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-surface-soft/60 px-5 py-2.5 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5"><kbd className="font-mono">↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1.5"><CornerDownLeft className="h-3 w-3" /> abrir</span>
          <span className="ml-auto flex items-center gap-1.5"><kbd className="font-mono">Ctrl K</kbd> alternar</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
