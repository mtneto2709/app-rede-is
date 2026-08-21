import { type NextRequest } from "next/server";
import { forwardToApi, REFRESH_COOKIE } from "@/lib/api-server";
import { loginResultResponse } from "@/lib/login-result-response";

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get("x-tenant-slug") ?? "demo";
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return loginResultResponse(401, {});
  }

  const { status, data } = await forwardToApi({
    method: "POST",
    path: "/auth/refresh",
    tenantSlug,
    body: { refreshToken },
  });

  // A resposta de /auth/refresh já é { accessToken, refreshToken }.
  return loginResultResponse(status, { status: "authenticated", ...(data as object) });
}
