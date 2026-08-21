import { NextResponse, type NextRequest } from "next/server";
import { forwardToApi } from "@/lib/api-server";
import { loginResultResponse } from "@/lib/login-result-response";

export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get("x-tenant-slug") ?? "demo";
  const firstAccessToken = request.headers.get("x-first-access-token") ?? "";
  const { status, data } = await forwardToApi({
    method: "GET",
    path: "/auth/first-access/questionnaire",
    tenantSlug,
    firstAccessToken,
  });
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get("x-tenant-slug") ?? "demo";
  const firstAccessToken = request.headers.get("x-first-access-token") ?? "";
  const body = await request.json();
  const { status, data } = await forwardToApi({
    method: "POST",
    path: "/auth/first-access/questionnaire",
    tenantSlug,
    firstAccessToken,
    body,
  });
  return loginResultResponse(status, data as never);
}
