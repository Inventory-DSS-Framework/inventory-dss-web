"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getRole, isAuthenticated } from "@/lib/auth";
import { isSellerRoute } from "@/hooks/useRole";
import { isOnboardingPending } from "@/lib/onboarding";
import { ExperienceProvider, useExperience } from "@/components/experience/ExperienceProvider";
import { AmbientBackground } from "@/components/experience/AmbientBackground";
import { CommandPalette } from "@/components/experience/CommandPalette";
import { GuidedTour } from "@/components/onboarding/GuidedTour";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!isAuthenticated() && pathname !== "/login") {
      window.location.replace("/login");
      return;
    }
    // Sellers only run the till: anything outside their routes sends them back to it.
    if (getRole() === "seller" && !isSellerRoute(pathname)) {
      window.location.replace("/sales/new");
      return;
    }
    // A freshly created account goes through the welcome flow first.
    if (pathname !== "/login" && pathname !== "/welcome" && !pathname.startsWith("/premium") && getRole() !== "seller" && isOnboardingPending()) {
      window.location.replace("/welcome");
    }
  }, [pathname]);

  if (!isMounted) return null;

  if (pathname === "/login") {
    return <>{children}</>;
  }

  // The Premium flow and the welcome onboarding are full-screen stages of their own:
  // no sidebar or topbar ever shows behind them — not on the first frame, not during the fade-in.
  if (pathname.startsWith("/premium") || pathname === "/welcome") {
    return (
      <ExperienceProvider>
        <div className={pathname === "/welcome" ? "min-h-screen" : "ps-root min-h-screen"}>{children}</div>
        <CommandPalette />
      </ExperienceProvider>
    );
  }

  return (
    <ExperienceProvider>
      <Shell pathname={pathname}>{children}</Shell>
    </ExperienceProvider>
  );
}

/**
 * Inset layout: the sidebar sits on the deep background and the workspace floats as a
 * rounded panel. On the Motor FTGM stage the sidebar folds into a rail so the black
 * canvas takes almost the whole screen.
 */
function Shell({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { stage } = useExperience();

  return (
    <div className="flex h-screen overflow-hidden bg-background-deep transition-colors duration-500">
      <Sidebar collapsed={stage === "ftgm"} />
      <div className="min-w-0 flex-1 py-2 pr-2">
        <div className="shell-panel relative flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-background">
          <AmbientBackground />
          <Topbar />
          <main className="relative z-[1] flex-1 overflow-y-auto px-5 py-8 lg:px-10">
            <div key={pathname} className="page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
      <CommandPalette />
      <GuidedTour />
    </div>
  );
}
