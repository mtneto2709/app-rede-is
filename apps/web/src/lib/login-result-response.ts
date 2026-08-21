import "server-only";
import { NextResponse } from "next/server";
import { REFRESH_COOKIE } from "./api-server";

export interface LoginResultLike {
  status?: "authenticated" | "first_access_required";
  accessToken?: string;
  refreshToken?: string;
  firstAccessToken?: string;
}

/**
 * Constrói a resposta HTTP para qualquer endpoint que retorne um
 * `LoginResult`: guarda o refresh token em cookie httpOnly e devolve ao
 * cliente apenas o que ele precisa manter em memória (access token ou
 * first-access token).
 */
export function loginResultResponse(httpStatus: number, data: LoginResultLike) {
  const response = NextResponse.json(data, { status: httpStatus });

  if (data.status === "authenticated" && data.refreshToken) {
    response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/bff",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}
