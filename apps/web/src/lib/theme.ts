import "server-only";
import { headers } from "next/headers";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadTenantTheme, type TenantTheme } from "@rede-is/theme-tokens";

// apps/web/src/lib -> ../../../../clients
const CLIENTS_DIR = join(process.cwd(), "..", "..", "clients");

export async function getCurrentTenantSlug(): Promise<string> {
  const h = await headers();
  return h.get("x-tenant-slug") ?? "demo";
}

export async function getCurrentTenantTheme(): Promise<TenantTheme> {
  const slug = await getCurrentTenantSlug();
  return loadTenantTheme(slug, async (s) => {
    const raw = await readFile(join(CLIENTS_DIR, s, "theme.json"), "utf-8");
    return JSON.parse(raw);
  });
}
