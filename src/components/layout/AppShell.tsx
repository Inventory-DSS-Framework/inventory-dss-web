"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!isAuthenticated() && pathname !== "/login") {
      window.location.replace("/login");
    }
  }, [pathname]);

  if (!isMounted) return null;

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-7 lg:px-8">
          <div key={pathname} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
