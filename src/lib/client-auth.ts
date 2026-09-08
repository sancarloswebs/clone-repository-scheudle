import type { PublicUser } from "@/lib/types";

export const TOKEN_KEY = "tesoreria_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore private-mode storage failures; cookie may still work.
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = authHeaders(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const timeout = AbortSignal.timeout(15000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
    signal,
  });
}

export async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const response = await apiFetch("/api/auth/me");
    const data = (await response.json()) as { user?: PublicUser | null };
    return data.user ?? null;
  } catch {
    return null;
  }
}
