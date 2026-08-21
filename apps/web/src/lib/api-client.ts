"use client";

/** Chama `/api/bff/me/<path>`, o proxy autenticado para os dados do paciente. */
export async function fetchMe<T>(path: string, accessToken: string | null): Promise<T> {
  if (!accessToken) throw new Error("Não autenticado");

  const response = await fetch(`/api/bff/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Falha ao carregar ${path}`);
  }

  return response.json();
}
