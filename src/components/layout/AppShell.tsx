"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mockSession = localStorage.getItem("mock-session");
    if (!mockSession && pathname !== "/login") {
      router.push("/login");
    }
  }, [pathname, router]);

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
