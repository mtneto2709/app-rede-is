import "server-only";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
export const REFRESH_COOKIE = "rede_is_refresh_token";

interface ForwardOptions {
  method: string;
  path: string;
  tenantSlug: string;
  body?: unknown;
  accessToken?: string;
  firstAccessToken?: string;
}

/**
 * Encaminha uma requisição do BFF (Next.js Route Handlers) para `apps/api`.
 * O navegador nunca fala diretamente com a API — isso permite manter o
 * refresh token em um cookie httpOnly, fora do alcance de JavaScript no
 * cliente (mitigação de XSS).
 */
export async function forwardToApi<T = unknown>(options: ForwardOptions): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-slug": options.tenantSlug,
  };
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  if (options.firstAccessToken) headers["x-first-access-token"] = options.firstAccessToken;

  const response = await fetch(`${API_BASE_URL}/api${options.path}`, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, data };
}
