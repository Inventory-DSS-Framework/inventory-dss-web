"use client";

import { getRole } from "@/lib/auth";

/** Routes a seller (cashier) may open. Everything else redirects to the till. */
export const SELLER_ROUTES = ["/sales/new", "/sales", "/sales/stock", "/notifications", "/login"];

export function isSellerRoute(pathname: string): boolean {
  return SELLER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export function useRole() {
  const role = getRole();
  return {
    role,
    isSeller: role === "seller",
    isAdmin: role === "owner" || role === "admin",
  };
}
