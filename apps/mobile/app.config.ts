import type { ExpoConfig, ConfigContext } from "expo/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// Import direto do submódulo (não do barrel "@rede-is/theme-tokens") porque
// o carregador de config do Expo executa este arquivo com a resolução ESM
// nativa do Node, que — ao contrário do Metro (bundler do app em si) e do
// tsc/ts-node-dev usados no resto do monorepo — exige extensão de arquivo
// explícita em imports relativos. O barrel (`src/index.ts`) reexporta
// `./schema` sem extensão, o que quebra só nesse carregamento específico.
import { TenantTheme } from "@rede-is/theme-tokens/src/schema.ts";

/**
 * White-label em tempo de build: cada compilação (`eas build --profile
 * <cliente>`, ver eas.json) define EXPO_PUBLIC_TENANT_SLUG e este arquivo
 * lê `clients/<slug>/theme.json` para gerar nome do app, ícone, splash,
 * bundle id/package e o tema injetado em `extra.theme` (lido em runtime por
 * `src/theme/ThemeProvider.tsx` via `expo-constants`).
 *
 * Cada cliente publica seu próprio binário na loja da própria conta — não
 * há seleção de tenant dentro do app em runtime.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const slug = process.env.EXPO_PUBLIC_TENANT_SLUG ?? "demo";
  const clientsDir = join(__dirname, "..", "..", "clients");
  const raw = JSON.parse(readFileSync(join(clientsDir, slug, "theme.json"), "utf-8"));
  const theme = TenantTheme.parse(raw);

  return {
    ...config,
    name: theme.branding.appName,
    slug: `rede-is-${theme.slug}`,
    scheme: `redeis-${theme.slug}`,
    version: "1.0.0",
    orientation: "portrait",
    icon: theme.branding.iconUrl,
    splash: {
      image: theme.branding.splashUrl,
      backgroundColor: theme.colors.background,
    },
    ios: {
      bundleIdentifier: theme.mobile.iosBundleId,
      supportsTablet: false,
      infoPlist: {
        NSFaceIDUsageDescription: "Usado para autenticar seu acesso de forma rápida e segura.",
      },
    },
    android: {
      package: theme.mobile.androidPackage,
      adaptiveIcon: {
        foregroundImage: theme.branding.iconUrl,
        backgroundColor: theme.colors.background,
      },
    },
    extra: {
      theme,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
      eas: theme.mobile.easProjectId ? { projectId: theme.mobile.easProjectId } : undefined,
    },
  };
};
