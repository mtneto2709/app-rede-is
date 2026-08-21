import { NextResponse, type NextRequest } from "next/server";
import { forwardToApi } from "@/lib/api-server";

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get("x-tenant-slug") ?? "demo";
  const body = await request.json();
  const { status, data } = await forwardToApi({ method: "POST", path: "/auth/otp/request", tenantSlug, body });
  return NextResponse.json(data, { status });
}
