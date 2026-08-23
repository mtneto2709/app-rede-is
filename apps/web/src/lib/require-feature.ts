import "server-only";
import { notFound } from "next/navigation";
import type { TenantTheme } from "@rede-is/theme-tokens";
import { getCurrentTenantTheme } from "./theme";

/**
 * Gate de rota por feature flag do tenant — chame no topo de cada page.tsx
 * server component gateado. Quando o flag está `false`, a rota vira um 404
 * real do Next (não é só esconder o botão): a tela não existe pra esse
 * cliente.
 */
export async function requireFeature(flag: keyof TenantTheme["features"]): Promise<TenantTheme> {
  const theme = await getCurrentTenantTheme();
  if (!theme.features[flag]) notFound();
  return theme;
}
