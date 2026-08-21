import { NextResponse, type NextRequest } from "next/server";

/**
 * Resolve o tenant (cliente white-label) a partir do subdomínio e injeta
 * `x-tenant-slug` em toda requisição — lido depois por `lib/theme.ts` e
 * repassado à API. Nunca confie em um slug vindo do corpo da requisição do
 * cliente.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const slug = resolveSlug(host);

  const headers = new Headers(request.headers);
  headers.set("x-tenant-slug", slug);

  return NextResponse.next({ request: { headers } });
}

function resolveSlug(host: string): string {
  if (host.includes("localhost") || host.startsWith("127.0.0.1")) {
    return "demo";
  }
  const [subdomain] = host.split(".");
  return subdomain || "demo";
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
