"use client";

import { useEffect, useState } from "react";
import { getCompanyId } from "@/lib/auth";

/** Returns the current company id from the JWT (after mount, client-only). */
export function useCompanyId(): string | null {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    setCompanyId(getCompanyId());
  }, []);
  return companyId;
}
