/** Authentication helpers: login/register/logout + JWT claim access. */
import { apiClient, clearTokens, getAccessToken, setTokens } from "./api-client";
import type { TokenDTO } from "@/types/api";

interface JwtClaims {
  sub?: string;
  company_id?: string;
  role?: string;
  exp?: number;
}

function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
  tax_id: string;
  business_type?: string;
}

export async function login(email: string, password: string): Promise<void> {
  const tokens = await apiClient.post<TokenDTO>(
    "/auth/login",
    { email, password },
    { anonymous: true },
  );
  setTokens(tokens.access_token, tokens.refresh_token);
}

export async function register(payload: RegisterPayload): Promise<void> {
  const tokens = await apiClient.post<TokenDTO>("/auth/register", payload, {
    anonymous: true,
  });
  setTokens(tokens.access_token, tokens.refresh_token);
}

export function logout(): void {
  clearTokens();
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const claims = decodeJwt(token);
  if (!claims?.exp) return true;
  return claims.exp * 1000 > Date.now();
}

export function getCompanyId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwt(token)?.company_id ?? null;
}

export function getRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwt(token)?.role ?? null;
}
