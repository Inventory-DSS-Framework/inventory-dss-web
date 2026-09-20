"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Building blocks for the onboarding "video": every scene is drawn on a fixed 800×500
 * stage (scaled to fit) and is a pure function of its progress `t` ∈ [0, 1], so the
 * player can play, pause, scrub and freeze it frame-exactly.
 */

export const W = 800;
export const H = 500;
export const SIDEBAR_W = 168;
export const CONTENT_X = SIDEBAR_W;
export const CONTENT_Y = 60;

// ─── Timing math ────────────────────────────────────────────────────────────
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Progress of `t` inside [a, b], clamped. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** True for a short window after `at` — used for click presses. */
export const pressed = (t: number, ats: number[], w = 0.025) => ats.some((a) => t >= a && t < a + w);

/** Piecewise path through [time, x, y] keyframes with eased moves. */
export function track(t: number, keys: [number, number, number][]): { x: number; y: number } {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, y1] = keys[i];
    const [t0, x0, y0] = keys[i - 1];
    if (t <= t1) {
      const p = easeInOut(seg(t, t0, t1));
      return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last[1], y: last[2] };
}

/** Latest caption whose start time has passed. */
export function captionAt(t: number, captions: [number, string][]): string {
  let text = captions[0]?.[1] ?? "";
  for (const [at, c] of captions) if (t >= at) text = c;
  return text;
}

// ─── Stage ──────────────────────────────────────────────────────────────────
export function Stage({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative w-full select-none overflow-hidden", className)} style={{ aspectRatio: `${W} / ${H}` }}>
      <div className="absolute left-0 top-0" style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Cursor ─────────────────────────────────────────────────────────────────
export function Cursor({ x, y, down, dark }: { x: number; y: number; down?: boolean; dark?: boolean }) {
  return (
    <div className="pointer-events-none absolute left-0 top-0 z-50" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {down && (
        <span
          className="absolute -left-4 -top-4 h-8 w-8 rounded-full"
          style={{ background: dark ? "rgb(52 211 153 / 0.35)" : "rgb(var(--c-primary) / 0.28)", animation: "scale-in 0.35s ease-out both" }}
        />
      )}
      <svg width="20" height="22" viewBox="0 0 20 22" style={{ transform: down ? "scale(0.88)" : "scale(1)", transition: "transform 120ms" }}>
        <path
          d="M2 1.5 L2 17.5 L6.4 13.6 L9.3 20.2 L12.2 18.9 L9.4 12.4 L15.4 12.4 Z"
          fill={dark ? "#f8fafc" : "rgb(var(--c-text))"}
          stroke={dark ? "#0b0f14" : "rgb(var(--c-surface))"}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── Mock app window ────────────────────────────────────────────────────────
type NavGroupMock = { label: string; brand?: boolean; items: { href: string; name: string }[] };

const NAV_GROUPS: NavGroupMock[] = [
  { label: "Inicio", items: [{ href: "/dashboard", name: "Panel" }] },
  { label: "Ventas", items: [{ href: "/sales/new", name: "Nueva venta" }, { href: "/sales", name: "Ventas" }] },
  { label: "Compras", items: [{ href: "/purchases/new", name: "Nueva compra" }, { href: "/suppliers", name: "Proveedores" }] },
  { label: "Inventario", items: [{ href: "/inventory", name: "Inventario" }, { href: "/products", name: "Catálogo" }] },
  { label: "Predicciones con IA", brand: true, items: [{ href: "/forecasting", name: "¿Cuánto venderé?" }, { href: "/forecasting?vista=comprar", name: "Qué comprar" }] },
];

/** Deterministic sidebar layout, so scenes can aim the cursor at a nav item. */
const NAV_LAYOUT = (() => {
  let y = 64;
  const groups: { label: string; brand?: boolean; y: number; items: { href: string; name: string; y: number }[] }[] = [];
  for (const g of NAV_GROUPS) {
    const gy = y;
    y += 16;
    const items = g.items.map((it) => {
      const iy = y;
      y += 26;
      return { ...it, y: iy };
    });
    groups.push({ label: g.label, brand: g.brand, y: gy, items });
    y += 8;
  }
  return groups;
})();

export function navCenter(href: string): { x: number; y: number } {
  for (const g of NAV_LAYOUT) for (const it of g.items) if (it.href === href) return { x: 84, y: it.y + 12 };
  return { x: 84, y: 90 };
}

export function MockWindow({
  path,
  crumb,
  active,
  highlight,
  dark,
  children,
}: {
  path: string;
  crumb: string;
  active?: string;
  highlight?: string | null;
  dark?: boolean;
  children: ReactNode;
}) {
  const c = dark
    ? { bg: "#05070a", side: "#080b10", line: "rgb(255 255 255 / 0.07)", text: "#e5e7eb", muted: "rgb(229 231 235 / 0.45)", chrome: "#0b0f14", item: "rgb(255 255 255 / 0.06)" }
    : { bg: "rgb(var(--c-bg))", side: "rgb(var(--c-bg-deep))", line: "rgb(var(--c-border))", text: "rgb(var(--c-text))", muted: "rgb(var(--c-text-muted))", chrome: "rgb(var(--c-surface-muted))", item: "rgb(var(--c-surface))" };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: c.bg, color: c.text, fontSize: 12 }}>
      {/* Browser chrome */}
      <div className="absolute inset-x-0 top-0 flex h-[26px] items-center gap-1.5 px-3" style={{ background: c.chrome, borderBottom: `1px solid ${c.line}` }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((col) => (
          <span key={col} className="h-2 w-2 rounded-full" style={{ background: col, opacity: 0.85 }} />
        ))}
        <span className="mx-auto rounded-md px-3 py-[2px] font-mono text-[9.5px]" style={{ background: dark ? "rgb(255 255 255 / 0.05)" : "rgb(var(--c-surface))", color: c.muted }}>
          app.inventorydss.pe{path}
        </span>
      </div>

      {/* Sidebar */}
      <div className="absolute bottom-0 left-0 top-[26px]" style={{ width: SIDEBAR_W, background: c.side, borderRight: `1px solid ${c.line}` }}>
        <div className="px-4 pt-2 font-display text-[13px] font-bold tracking-tight">
          Inventory<span style={{ color: dark ? "rgb(52 211 153)" : "rgb(var(--c-primary))" }}>DSS</span>
        </div>
        {NAV_LAYOUT.map((g) => (
          <div key={g.label}>
            {g.brand && (
              <div
                className="absolute left-2 right-2 rounded-xl"
                style={{
                  top: g.y - 30,
                  height: g.items.length * 26 + 22,
                  background: dark ? "rgb(167 139 250 / 0.08)" : "rgb(var(--c-accent-soft) / 0.6)",
                  border: `1px solid ${dark ? "rgb(167 139 250 / 0.2)" : "rgb(var(--c-accent) / 0.15)"}`,
                }}
              />
            )}
            <p
              className="absolute left-4 text-[8.5px] font-semibold uppercase tracking-[0.14em]"
              style={{ top: g.y - 26, color: g.brand ? (dark ? "rgb(167 139 250)" : "rgb(var(--c-accent))") : c.muted }}
            >
              {g.label}
            </p>
            {g.items.map((it) => {
              const isActive = it.href === active;
              const isHi = it.href === highlight;
              return (
                <div
                  key={it.href}
                  className="absolute left-2.5 right-2.5 flex items-center gap-2 rounded-lg px-2.5 text-[11.5px] font-medium transition-all duration-300"
                  style={{
                    top: it.y - 26,
                    height: 24,
                    background: isActive ? (g.brand ? (dark ? "rgb(167 139 250 / 0.9)" : "rgb(var(--c-accent))") : c.item) : isHi ? (dark ? "rgb(255 255 255 / 0.08)" : "rgb(var(--c-primary-soft))") : "transparent",
                    color: isActive && g.brand ? "#fff" : isHi ? (dark ? "#fff" : "rgb(var(--c-primary))") : c.text,
                    boxShadow: isHi ? `0 0 0 2px ${dark ? "rgb(52 211 153 / 0.6)" : "rgb(var(--c-primary) / 0.45)"}` : isActive && !g.brand ? `0 1px 2px rgb(0 0 0 / 0.06), inset 0 0 0 1px ${c.line}` : "none",
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "currentColor", opacity: isActive || isHi ? 0.9 : 0.35 }} />
                  {it.name}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Topbar */}
      <div className="absolute right-0 top-[26px] flex h-[34px] items-center justify-between px-4" style={{ left: SIDEBAR_W, borderBottom: `1px solid ${c.line}` }}>
        <span className="text-[11px]" style={{ color: c.muted }}>
          {crumb}
        </span>
        <span className="flex h-5 w-40 items-center rounded-md px-2 text-[9.5px]" style={{ border: `1px solid ${c.line}`, color: c.muted }}>
          Buscar o saltar a… <span className="ml-auto font-mono">Ctrl K</span>
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 right-0" style={{ left: CONTENT_X, top: CONTENT_Y }}>
        {children}
      </div>
    </div>
  );
}

/** Rounded token-styled box used by scenes for cards and panels. */
export function Box({ className, style, children }: { className?: string; style?: React.CSSProperties; children?: ReactNode }) {
  return (
    <div className={cn("absolute rounded-xl border border-border bg-surface shadow-soft", className)} style={style}>
      {children}
    </div>
  );
}
