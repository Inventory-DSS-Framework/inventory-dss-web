"use client";

import Link from "next/link";
import { Search, Bell, Sparkles, LayoutGrid } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { initialsOf, useProfile } from "@/hooks/useProfile";
import { notificationsApi } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  analyst: "Analista",
  viewer: "Lector",
};

export function Topbar() {
  const { user } = useProfile();
  const companyId = useCompanyId();
  const notifs = useApi(
    () => (companyId ? notificationsApi.list(companyId) : Promise.resolve(null)),
    [companyId],
  );
  const unread = (notifs.data?.items ?? []).filter((n) => !n.is_read).length;

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-border flex items-center justify-between gap-4 px-6 lg:px-8 shrink-0">
      {/* Search (visual) */}
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Buscar productos, reportes, pronósticos…"
            className="w-full bg-surface-soft border border-transparent rounded-xl py-2.5 pl-10 pr-16 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-lg bg-accent-violet-soft px-2 py-1 text-[10px] font-semibold text-accent-violet">
            <Sparkles className="w-3 h-3" />
            IA
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary hidden sm:inline-flex gap-1.5 px-4 py-2 text-sm"
        >
          <Sparkles className="w-4 h-4" />
          Actualizar
        </button>

        <div className="hidden md:flex items-center gap-0.5 ml-1">
          <Link
            href="/notifications"
            aria-label="Notificaciones"
            className="relative p-2.5 rounded-xl text-text-secondary hover:bg-surface-soft hover:text-text-primary transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger ring-2 ring-surface" />
            )}
          </Link>
          <Link
            href="/dashboard"
            aria-label="Panel de control"
            className="p-2.5 rounded-xl text-text-secondary hover:bg-surface-soft hover:text-text-primary transition-colors"
          >
            <LayoutGrid className="h-[18px] w-[18px]" />
          </Link>
        </div>

        <Link
          href="/settings"
          className="ml-1 flex items-center gap-2.5 pl-2.5 border-l border-border group"
        >
          <div className="hidden lg:block text-right leading-tight">
            <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
              {user?.full_name ?? "—"}
            </p>
            <p className="text-[11px] text-text-muted">
              {user ? ROLE_LABEL[user.role] ?? user.role : ""}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-accent-violet-soft flex items-center justify-center text-xs font-bold text-accent-violet ring-1 ring-accent-violet/15">
            {initialsOf(user?.full_name)}
          </div>
        </Link>
      </div>
    </header>
  );
}
