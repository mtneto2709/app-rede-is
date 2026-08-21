import { NextResponse, type NextRequest } from "next/server";
import { forwardToApi } from "@/lib/api-server";

/** Proxy autenticado genérico para os endpoints somente-leitura em /api/me/**. */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const tenantSlug = request.headers.get("x-tenant-slug") ?? "demo";
  const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!accessToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const { status, data } = await forwardToApi({
    method: "GET",
    path: `/me/${path.join("/")}`,
    tenantSlug,
    accessToken,
  });
  return NextResponse.json(data, { status });
}
