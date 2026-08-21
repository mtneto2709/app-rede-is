import { NextResponse, type NextRequest } from "next/server";
import { forwardToApi, REFRESH_COOKIE } from "@/lib/api-server";

/** Exclusão de conta (exigência da App Store e da Play Store). */
export async function DELETE(request: NextRequest) {
  const tenantSlug = request.headers.get("x-tenant-slug") ?? "demo";
  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!accessToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const { status, data } = await forwardToApi({ method: "DELETE", path: "/auth/me", tenantSlug, accessToken });
  const response = NextResponse.json(data, { status });
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
