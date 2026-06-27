"use client";

import { useApi } from "./useApi";
import { useCompanyId } from "./useCompanyId";
import { authApi, companiesApi } from "@/lib/api";
import type { CompanyDTO, UserDTO } from "@/types/api";

/** First letters of a name, e.g. "Roberto Gómez" -> "RG". */
export function initialsOf(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function useProfile(): { user: UserDTO | null; company: CompanyDTO | null } {
  const companyId = useCompanyId();
  const user = useApi(() => authApi.me(), []);
  const company = useApi(
    () => (companyId ? companiesApi.get(companyId) : Promise.resolve(null)),
    [companyId],
  );
  return { user: user.data, company: company.data };
}
