"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCompanyId, getRole, isAuthenticated } from "@/lib/auth";
import { isSellerRoute } from "@/hooks/useRole";
import { ONBOARDING_PREF, isOnboardingPending, markOnboardingPending } from "@/lib/onboarding";
import { productsApi } from "@/lib/api";
import { preferencesApi } from "@/lib/apis/custom-fields";
import { ExperienceProvider, useExperience } from "@/components/experience/ExperienceProvider";
import { AmbientBackground } from "@/components/experience/AmbientBackground";
import { CommandPalette } from "@/components/experience/CommandPalette";
import { GuidedTour } from "@/components/onboarding/GuidedTour";

/** Layout effects commit before paint, so the guard never lets a wrong screen flash. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Gate = "checking" | "redirecting" | "ok";

/**
 * Where this pathname should really send the person, or null if they belong here.
 * Session state only lives in localStorage, so this can only run on the client.
 */
function redirectTargetFor(pathname: string): string | null {
  if (!isAuthenticated()) return pathname === "/login" ? null : "/login";
  // Signed in: the login page hands off by itself (it knows where the person goes next).
  if (pathname === "/login") return null;
  // Sellers only run the till: anything outside their routes sends them back to it.
  if (getRole() === "seller") return isSellerRoute(pathname) ? null : "/sales/new";
  // A freshly created account goes through the welcome flow first.
  const onAppScreen = pathname !== "/welcome" && !pathname.startsWith("/premium");
  if (onAppScreen && isOnboardingPending()) return "/welcome";
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");

  // Decide before the first paint: either this screen is the right one, or we are on our
  // way somewhere else and nothing of this one is ever shown (no flash, no bounce).
  useIsomorphicLayoutEffect(() => {
    const target = redirectTargetFor(pathname);
    if (target && target !== pathname) {
      setGate("redirecting");
      router.replace(target);
      return;
    }
    setGate("ok");
  }, [pathname, router]);

  // Same on any device/browser: an account that never finished (or skipped) the welcome
  // flow and still has no products starts there. Checked once per session.
  useEffect(() => {
    if (gate !== "ok") return;
    const onAppScreen = pathname !== "/login" && pathname !== "/welcome" && !pathname.startsWith("/premium");
    if (onAppScreen && getRole() !== "seller") void checkServerOnboarding((to) => router.replace(to));
  }, [gate, pathname, router]);

  // Neutral ground while deciding: same background as the app, so the hand-off is invisible.
  if (gate !== "ok") return <div aria-hidden className="min-h-screen bg-background" />;

  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Checkout and the welcome onboarding are full-screen stages of their own: no sidebar or
  // topbar ever shows behind them. The plans page itself is an ordinary page in the app.
  if (pathname.startsWith("/premium/") || pathname === "/welcome") {
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
 * The navigation is the framed piece: the sidebar floats as a rounded panel on the
 * left, and the page content sits directly on the app background (no extra container
 * around every screen).
 */
function Shell({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { stage } = useExperience();

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-500">
      <div className="shrink-0 py-2 pl-2">
        <div className="shell-panel flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background-deep/60">
          <Sidebar collapsed={stage === "ftgm"} />
        </div>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <AmbientBackground />
        <Topbar />
        <main className="relative z-[1] flex-1 overflow-y-auto px-5 py-8 lg:px-10">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
      <GuidedTour />
    </div>
  );
}

const ONBOARDING_CHECKED = "dss-onboarding-checked";

async function checkServerOnboarding(go: (to: string) => void) {
  try {
    if (window.sessionStorage.getItem(ONBOARDING_CHECKED)) return;
    window.sessionStorage.setItem(ONBOARDING_CHECKED, "1");
  } catch {
    return;
  }
  const companyId = getCompanyId();
  if (!companyId) return;
  try {
    const [pref, products] = await Promise.all([
      preferencesApi.get(companyId, ONBOARDING_PREF),
      productsApi.list(companyId),
    ]);
    if (!pref.value && products.length === 0) {
      markOnboardingPending();
      go("/welcome");
    }
  } catch {
    /* offline or no access: never block the app on this */
  }
}
