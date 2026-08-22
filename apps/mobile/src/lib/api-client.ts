import * as SecureStore from "expo-secure-store";
import type { StartQuestionnaireResult, SelectCandidateInput } from "@rede-is/shared-types";
import { apiBaseUrl } from "@/theme/theme-provider";

const REFRESH_TOKEN_KEY = "rede_is_refresh_token";

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function storeRefreshToken(token: string): Promise<void> {
  // SecureStore usa o Keychain (iOS) / Keystore (Android) — nunca
  // AsyncStorage puro, que não é criptografado.
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  accessToken?: string;
  firstAccessToken?: string;
  tenantSlug: string;
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-slug": options.tenantSlug,
  };
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  if (options.firstAccessToken) headers["x-first-access-token"] = options.firstAccessToken;

  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { message?: string }).message ?? `Falha ao chamar ${path}`);
  }
  return data as T;
}

export interface LoginResult {
  status: "authenticated" | "first_access_required";
  accessToken?: string;
  refreshToken?: string;
  firstAccessToken?: string;
}

async function persistIfAuthenticated(result: LoginResult): Promise<LoginResult> {
  if (result.status === "authenticated" && result.refreshToken) {
    await storeRefreshToken(result.refreshToken);
  }
  return result;
}

export const authApi = {
  requestOtp: (tenantSlug: string, channel: string, contact: string) =>
    request<void>("/auth/otp/request", { method: "POST", tenantSlug, body: { channel, contact } }),

  verifyOtp: (tenantSlug: string, channel: string, contact: string, code: string) =>
    request<LoginResult>("/auth/otp/verify", { method: "POST", tenantSlug, body: { channel, contact, code } }).then(
      persistIfAuthenticated,
    ),

  socialLogin: (tenantSlug: string, provider: "google" | "apple", idToken: string) =>
    request<LoginResult>("/auth/social/login", { method: "POST", tenantSlug, body: { provider, idToken } }).then(
      persistIfAuthenticated,
    ),

  getQuestionnaire: (tenantSlug: string, firstAccessToken: string) =>
    request<StartQuestionnaireResult>("/auth/first-access/questionnaire", { tenantSlug, firstAccessToken }),

  selectCandidate: (tenantSlug: string, firstAccessToken: string, input: SelectCandidateInput) =>
    request<Extract<StartQuestionnaireResult, { status: "ready" }>>("/auth/first-access/candidate", {
      method: "POST",
      tenantSlug,
      firstAccessToken,
      body: input,
    }),

  submitQuestionnaire: (
    tenantSlug: string,
    firstAccessToken: string,
    attemptId: string,
    answers: { questionId: string; optionId: string }[],
  ) =>
    request<LoginResult>("/auth/first-access/questionnaire", {
      method: "POST",
      tenantSlug,
      firstAccessToken,
      body: { attemptId, answers },
    }).then(persistIfAuthenticated),

  refresh: async (tenantSlug: string): Promise<LoginResult | null> => {
    const refreshToken = await getStoredRefreshToken();
    if (!refreshToken) return null;
    try {
      const result = await request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
        method: "POST",
        tenantSlug,
        body: { refreshToken },
      });
      await storeRefreshToken(result.refreshToken);
      return { status: "authenticated", accessToken: result.accessToken, refreshToken: result.refreshToken };
    } catch {
      await clearRefreshToken();
      return null;
    }
  },

  logout: async (tenantSlug: string, accessToken: string) => {
    await request("/auth/logout", { method: "POST", tenantSlug, accessToken }).catch(() => undefined);
    await clearRefreshToken();
  },

  deleteAccount: async (tenantSlug: string, accessToken: string) => {
    await request("/auth/me", { method: "DELETE", tenantSlug, accessToken });
    await clearRefreshToken();
  },
};

export function fetchMe<T>(tenantSlug: string, accessToken: string, path: string): Promise<T> {
  return request<T>(`/me/${path}`, { tenantSlug, accessToken });
}

export function fetchTenant<T>(tenantSlug: string, path: string): Promise<T> {
  return request<T>(`/tenants/current/${path}`, { tenantSlug });
}
