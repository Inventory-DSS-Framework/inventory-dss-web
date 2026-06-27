/**
 * HTTP client for the Inventory DSS API.
 *
 * - Reads the access token from localStorage and sends it as a Bearer header.
 * - Parses the backend's ErrorResponse ({ code, message }) into thrown Errors.
 * - On 401 it clears the session and redirects to /login.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  /** Skip attaching the Authorization header (used by login/register). */
  anonymous?: boolean;
}

async function request<TResponse>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<TResponse> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (!options.anonymous) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearTokens();
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
    throw new ApiError("Sesión expirada", 401);
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    let code: string | undefined;
    try {
      const data = await response.json();
      message = data?.message ?? message;
      code = data?.code;
    } catch {
      /* response had no JSON body */
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) return undefined as TResponse;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return (await response.blob()) as TResponse;
  }
  return (await response.json()) as TResponse;
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
