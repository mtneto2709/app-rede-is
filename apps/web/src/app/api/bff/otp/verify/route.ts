import { type NextRequest } from "next/server";
import { forwardToApi } from "@/lib/api-server";
import { loginResultResponse } from "@/lib/login-result-response";

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get("x-tenant-slug") ?? "demo";
  const body = await request.json();
  const { status, data } = await forwardToApi({ method: "POST", path: "/auth/otp/verify", tenantSlug, body });
  return loginResultResponse(status, data as never);
}
