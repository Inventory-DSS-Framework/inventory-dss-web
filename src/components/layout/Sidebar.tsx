"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Settings, Activity, BarChart2, Bell, FileText, ChevronsUpDown,
  Sparkles, LogOut, Archive, Lightbulb, BrainCircuit, ScanBarcode, Receipt, PackagePlus,
  Truck, Crown, Users, Search, Lock, ShoppingBag, Boxes,
} from "lucide-react";
import { logout } from "@/lib/auth";
import { initialsOf, useProfile } from "@/hooks/useProfile";
import { usePlan } from "@/hooks/usePlan";
import { useRole } from "@/hooks/useRole";

export type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
};
export type NavGroup = {
  key: string;
  label: string;
  icon?: typeof LayoutDashboard;
  /** "brand" tints the whole group (the FTGM engine, set apart from day-to-day ERP work). */
  tone?: "brand";
  items: NavItem[];
};

// The ERP is the business's day-to-day: sell, buy, keep stock. "Motor FTGM" is the
// forecasting brain plus everything it produces (recommendations, KPIs, reports).
export const adminNav: NavGroup[] = [
  { key: "home", label: "Inicio", items: [{ name: "Panel", href: "/dashboard", icon: LayoutDashboard }] },
  {
    key: "sales",
    label: "Ventas",
    icon: ShoppingBag,
    items: [
      { name: "Nueva venta", href: "/sales/new", icon: ScanBarcode },
      { name: "Ventas", href: "/sales", icon: Receipt },
    ],
  },
  {
    key: "purchases",
    label: "Compras",
    icon: Truck,
    items: [
      { name: "Nueva compra", href: "/purchases/new", icon: PackagePlus },
      { name: "Proveedores", href: "/suppliers", icon: Truck },
    ],
  },
  {
    key: "inventory",
    label: "Inventario",
    icon: Boxes,
    items: [
      { name: "Inventario", href: "/inventory", icon: Archive },
      { name: "Catálogo", href: "/products", icon: Package },
    ],
  },
  {
    key: "ftgm",
    label: "Motor FTGM",
    icon: BrainCircuit,
    tone: "brand",
    items: [
      { name: "Pronóstico", href: "/forecasting", icon: Activity },
      { name: "Recomendaciones", href: "/recommendations", icon: Lightbulb },
      { name: "KPIs", href: "/kpis", icon: BarChart2 },
      { name: "Reportes", href: "/reports", icon: FileText },
    ],
  },
  {
    key: "system",
    label: "Sistema",
    items: [
      { name: "Usuarios", href: "/settings/users", icon: Users },
      { name: "Notificaciones", href: "/notifications", icon: Bell },
      { name: "Ajustes", href: "/settings", icon: Settings },
    ],
  },
];

// Sellers (cashiers) only see the till, their sales and a product/stock lookup.
export const sellerNav: NavGroup[] = [
  {
    key: "sales",
    label: "Caja",
    icon: ShoppingBag,
    items: [
      { name: "Nueva venta", href: "/sales/new", icon: ScanBarcode },
      { name: "Ventas", href: "/sales", icon: Receipt },
      { name: "Consultar productos", href: "/sales/stock", icon: Search },
    ],
  },
  { key: "system", label: "Sistema", items: [{ name: "Notificaciones", href: "/notifications", icon: Bell }] },
];

/** Longest-prefix match so /sales/new never also lights up /sales. */
export function activeHrefFor(pathname: string, sections: NavGroup[]) {
  return sections
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];
}

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { company } = useProfile();
  const { isSeller } = useRole();
  const { isPremium, loading: planLoading } = usePlan();
  const navSections = isSeller ? sellerNav : adminNav;
  const activeHref = activeHrefFor(pathname, navSections);

  return (
    <aside
      className={cn(
        "relative z-10 flex h-full shrink-0 flex-col transition-[width] duration-500 [transition-timing-function:var(--ease-out)]",
        collapsed ? "w-[76px]" : "w-[256px]",
      )}
    >
      {/* Wordmark */}
      <div className={cn("flex h-[60px] items-center", collapsed ? "justify-center" : "px-6")}>
        <Link href={isSeller ? "/sales/new" : "/dashboard"} className="font-display text-[17px] font-bold tracking-[-0.03em] text-text-primary">
          {collapsed ? (
            <span className="text-primary">DSS</span>
          ) : (
            <>
              Inventory<span className="text-primary">DSS</span>
            </>
          )}
        </Link>
      </div>

      {/* Company */}
      <div className={cn("pb-4", collapsed ? "px-3" : "px-4")}>
        <div
          title={company?.name}
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-border bg-surface/70 p-2 shadow-soft transition-colors hover:bg-surface",
            collapsed && "justify-center",
          )}
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent-violet font-display text-[13px] font-bold text-white">
            {initialsOf(company?.name)}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10.5px] font-medium leading-tight text-text-muted">{isSeller ? "Caja" : "Empresa"}</p>
                <p className="truncate text-[13px] font-semibold leading-tight text-text-primary">{company?.name ?? "—"}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-muted" />
            </>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-5 overflow-y-auto overflow-x-hidden pb-3", collapsed ? "px-3" : "px-3")}>
        {navSections.map((section) => {
          const brand = section.tone === "brand";
          return (
            <div
              key={section.key}
              className={cn(
                brand &&
                  !collapsed &&
                  "relative overflow-hidden rounded-2xl border border-accent-violet/15 bg-gradient-to-b from-accent-violet-soft/60 to-accent-violet-soft/10 p-1.5 pt-2.5",
                brand && collapsed && "rounded-2xl border border-accent-violet/20 bg-accent-violet-soft/30 py-1.5",
              )}
            >
              {collapsed ? (
                !brand && <div className="mx-auto mb-2 h-px w-6 bg-border first:hidden" />
              ) : (
                <div className="mb-1.5 flex items-center justify-between gap-1.5 px-3">
                  <span className="flex items-center gap-1.5">
                    {section.icon && (
                      <section.icon className={cn("h-3 w-3 shrink-0", brand ? "text-accent-violet" : "text-text-muted")} />
                    )}
                    <p
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.14em]",
                        brand ? "text-accent-violet" : "text-text-muted",
                      )}
                    >
                      {section.label}
                    </p>
                  </span>
                  {brand && !planLoading && (
                    <Link
                      href="/premium"
                      className={cn(
                        "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold transition-opacity hover:opacity-90",
                        isPremium ? "bg-accent-violet text-white" : "bg-surface text-accent-violet ring-1 ring-accent-violet/30",
                      )}
                      title={isPremium ? "Plan Premium activo" : "Desbloquea FTGM completo"}
                    >
                      {isPremium ? <Crown className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                      {isPremium ? "PRO" : "1 producto"}
                    </Link>
                  )}
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour={item.href}
                      title={collapsed ? item.name : undefined}
                      aria-label={item.name}
                      className={cn(
                        "group relative flex items-center rounded-xl text-[13.5px] font-medium transition-all duration-200",
                        collapsed ? "mx-auto h-10 w-10 justify-center" : "gap-3 px-3 py-2",
                        isActive
                          ? brand
                            ? "bg-accent-violet text-white shadow-[0_6px_18px_-8px_rgb(var(--c-accent)/0.8)]"
                            : "border border-border bg-surface text-text-primary shadow-soft"
                          : brand
                            ? "text-text-secondary hover:bg-surface/70 hover:text-text-primary"
                            : "border border-transparent text-text-secondary hover:bg-surface/60 hover:text-text-primary",
                      )}
                    >
                      {isActive && !brand && !collapsed && (
                        <span className="absolute -left-3 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_rgb(var(--c-glow)/0.7)]" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-all duration-200 group-hover:scale-110",
                          isActive ? (brand ? "text-white" : "text-primary") : "text-text-muted group-hover:text-text-secondary",
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className={cn("space-y-1.5", collapsed ? "px-3 pb-4" : "p-3")}>
        {!isSeller && !planLoading && !isPremium && !collapsed && (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/15 blur-2xl"
            />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                Plan gratuito
              </div>
              <p className="mt-2.5 text-[13px] font-semibold leading-snug text-text-primary">ERP completo + FTGM en 1 producto</p>
              <p className="mt-1 text-xs leading-snug text-text-secondary">Pronostica todo tu catálogo con el motor FTGM.</p>
              <Link href="/premium" className="btn btn-primary mt-3 h-9 w-full gap-1.5 text-xs">
                <Crown className="h-3.5 w-3.5" /> Descubrir Premium
              </Link>
            </div>
          </div>
        )}
        {!isSeller && isPremium && (
          <Link
            href="/premium"
            title="Premium activo"
            className={cn(
              "flex items-center gap-2.5 rounded-2xl border border-border bg-surface/70 transition-colors hover:bg-surface",
              collapsed ? "mx-auto h-10 w-10 justify-center" : "px-3 py-2.5",
            )}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent-violet text-white">
              <Crown className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-text-primary">Premium activo</span>
                <span className="block text-[11px] text-text-muted">Motor FTGM completo</span>
              </span>
            )}
          </Link>
        )}

        <Link
          href="/login"
          title={collapsed ? "Salir" : undefined}
          onClick={() => {
            try {
              logout();
            } catch {}
          }}
          className={cn(
            "flex items-center rounded-xl text-[13.5px] font-medium text-text-secondary transition-colors hover:bg-surface/60 hover:text-text-primary",
            collapsed ? "mx-auto h-10 w-10 justify-center" : "gap-3 px-3 py-2",
          )}
        >
          <LogOut className="h-[18px] w-[18px] text-text-muted" />
          {!collapsed && "Salir"}
        </Link>
      </div>
    </aside>
  );
}
