"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Crown, LogOut, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useCompanyId } from "@/hooks/useCompanyId";
import { initialsOf, useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { notificationsApi } from "@/lib/api";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { useExperience } from "@/components/experience/ExperienceProvider";
import { openCommandPalette } from "@/components/experience/CommandPalette";
import { activeHrefFor, adminNav, sellerNav } from "./Sidebar";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  analyst: "Analista",
  viewer: "Lector",
  seller: "Vendedor",
};

function useBreadcrumb(pathname: string, isSeller: boolean) {
  const sections = isSeller ? sellerNav : adminNav;
  const href = activeHrefFor(pathname, sections);
  const group = sections.find((g) => g.items.some((i) => i.href === href));
  const item = group?.items.find((i) => i.href === href);
  if (item && group) {
    const detail = pathname !== href ? "Detalle" : null;
    return { group: group.label, item: item.name, detail };
  }
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  return { group: "InventoryDSS", item: last ? last.charAt(0).toUpperCase() + last.slice(1) : "Inicio", detail: null };
}

export function Topbar() {
  const pathname = usePathname();
  const { user } = useProfile();
  const { isSeller } = useRole();
  const { stage, isPremium } = useExperience();
  const companyId = useCompanyId();
  const notifs = useApi(
    () => (companyId ? notificationsApi.list(companyId) : Promise.resolve(null)),
    [companyId],
  );
  const unread = (notifs.data?.items ?? []).filter((n) => !n.is_read).length;
  const crumb = useBreadcrumb(pathname, isSeller);
  const onStage = stage === "ftgm";

  return (
    <header className="relative z-20 flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-border/70 bg-background/55 px-5 backdrop-blur-xl lg:px-8">
      {/* Where am I */}
      <div className="flex min-w-0 items-center gap-2.5 text-sm">
        {onStage ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgb(var(--c-primary))]" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Motor FTGM</span>
          </>
        ) : (
          <span className="truncate text-text-muted">{crumb.group}</span>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted/60" />
        <span className="truncate font-medium text-text-primary">{crumb.item}</span>
        {crumb.detail && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted/60" />
            <span className="truncate text-text-secondary">{crumb.detail}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={openCommandPalette}
          data-tour="search"
          className="hidden h-9 w-[min(280px,26vw)] items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-3 text-sm text-text-muted transition-colors hover:border-text-muted/40 hover:text-text-secondary md:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">Buscar o saltar a…</span>
          <kbd className="rounded-md border border-border bg-surface-soft px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
        </button>

        {onStage && (
          <Link href="/dashboard" className="btn btn-secondary ml-1 h-9 gap-1.5 px-3 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Salir del motor
          </Link>
        )}

        {!onStage && !isSeller && !isPremium && (
          <Link
            href="/premium"
            className="hidden h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft lg:inline-flex"
          >
            <Crown className="h-3.5 w-3.5" />
            Mejorar
          </Link>
        )}

        {!onStage && <ModeToggle />}

        <Link
          href="/notifications"
          aria-label="Notificaciones"
          className="relative grid h-9 w-9 place-items-center rounded-xl text-text-secondary transition-colors hover:bg-surface-muted/80 hover:text-text-primary"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <span className="mx-1.5 h-6 w-px bg-border" />

        <Link href={isSeller ? "/sales/new" : "/settings"} className="group flex items-center gap-2.5">
          <div className="hidden text-right leading-tight lg:block">
            <p className="text-[13px] font-semibold text-text-primary transition-colors group-hover:text-primary">
              {user?.full_name ?? "—"}
            </p>
            <p className="text-[11px] text-text-muted">{user ? ROLE_LABEL[user.role] ?? user.role : ""}</p>
          </div>
          <div
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary ring-2 ring-background transition-shadow group-hover:shadow-[0_0_0_3px_rgb(var(--c-primary)/0.25)]",
            )}
          >
            {initialsOf(user?.full_name)}
          </div>
        </Link>
      </div>
    </header>
  );
}
