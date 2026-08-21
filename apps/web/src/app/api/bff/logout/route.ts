import { NextResponse, type NextRequest } from "next/server";
import { forwardToApi, REFRESH_COOKIE } from "@/lib/api-server";

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get("x-tenant-slug") ?? "demo";
  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");

  if (accessToken) {
    await forwardToApi({ method: "POST", path: "/auth/logout", tenantSlug, accessToken });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
