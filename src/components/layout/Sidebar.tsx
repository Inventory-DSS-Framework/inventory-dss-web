"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, TrendingUp, Archive, UploadCloud,
  Settings, Activity, BarChart2, Bell, FileText, CheckCircle, Database,
  ChevronsUpDown, Sparkles, LogOut, FolderOpen,
} from "lucide-react";
import { logout } from "@/lib/auth";
import { initialsOf, useProfile } from "@/hooks/useProfile";

type NavItem = { name: string; href: string; icon: typeof LayoutDashboard };

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Datos",
    items: [
      { name: "Ingesta", href: "/ingestion", icon: UploadCloud },
      { name: "Productos", href: "/products", icon: Package },
      { name: "Ventas", href: "/sales", icon: TrendingUp },
      { name: "Inventario", href: "/inventory", icon: Archive },
      { name: "Preparación", href: "/data-preparation", icon: Database },
    ],
  },
  {
    label: "Inteligencia",
    items: [
      { name: "Predicción", href: "/forecasting", icon: Activity },
      { name: "KPIs", href: "/kpis", icon: BarChart2 },
      { name: "Recomendaciones", href: "/recommendations", icon: CheckCircle },
    ],
  },
  {
    label: "Salida",
    items: [
      { name: "Reportes", href: "/reports", icon: FileText },
      { name: "Notificaciones", href: "/notifications", icon: Bell },
      { name: "Archivos", href: "/files", icon: FolderOpen },
      { name: "Validación", href: "/validation", icon: CheckCircle },
      { name: "Configuración", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { company } = useProfile();

  return (
    <aside className="w-[260px] bg-surface h-full flex flex-col border-r border-border shrink-0">
      {/* Brand wordmark */}
      <div className="px-5 pt-6 pb-2">
        <span className="font-display text-lg font-bold tracking-tight text-text-primary">
          Inventory<span className="text-primary">DSS</span>
        </span>
      </div>

      {/* Company */}
      <div className="px-4 pb-3">
        <div className="w-full flex items-center gap-3 rounded-2xl border border-border bg-surface-soft p-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center shrink-0 text-sm font-bold text-primary">
            {initialsOf(company?.name)}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[11px] font-medium text-text-muted leading-tight">Empresa</p>
            <p className="text-sm font-semibold text-text-primary truncate leading-tight">
              {company?.name ?? "—"}
            </p>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-text-muted shrink-0" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-150",
                      isActive
                        ? "bg-primary-soft text-primary"
                        : "text-text-secondary hover:bg-surface-soft hover:text-text-primary"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                    )}
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Trial / upgrade card */}
      <div className="p-3">
        <div className="rounded-2xl bg-accent-violet-soft border border-accent-violet/15 p-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-accent-violet">
            <Sparkles className="w-3 h-3" />
            Prueba gratis
          </div>
          <p className="mt-3 text-2xl font-bold leading-none text-text-primary">
            3 <span className="text-sm font-medium text-text-secondary">meses</span>
          </p>
          <p className="mt-1.5 text-xs text-text-secondary leading-snug">
            Acceso completo a todos los módulos del DSS.
          </p>
          <button className="btn btn-violet mt-3 w-full py-2 text-xs">
            Plan Premium
          </button>
        </div>

        <Link
          href="/login"
          onClick={() => { try { logout(); } catch {} }}
          className="mt-2 flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl text-text-secondary hover:bg-surface-soft hover:text-text-primary transition-colors"
        >
          <LogOut className="h-[18px] w-[18px] text-text-muted" />
          Salir
        </Link>
      </div>
    </aside>
  );
}
