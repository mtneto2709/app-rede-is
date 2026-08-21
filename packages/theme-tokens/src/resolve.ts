import { TenantTheme } from "./schema";

/**
 * Carrega e valida a configuração de um tenant a partir de
 * `clients/<slug>/theme.json`. Lança se o slug não existir ou o arquivo
 * estiver inválido — nunca cai silenciosamente em um tema default para uma
 * requisição de produção, já que isso vazaria a identidade de um cliente
 * para outro.
 */
export async function loadTenantTheme(
  slug: string,
  readJson: (slug: string) => Promise<unknown>,
): Promise<TenantTheme> {
  const raw = await readJson(slug);
  const result = TenantTheme.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Tema inválido para o tenant "${slug}": ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

/** Converte as cores do tema em CSS custom properties para o portal web. */
export function themeToCssVariables(theme: TenantTheme): Record<string, string> {
  return {
    "--color-primary": theme.colors.primary,
    "--color-primary-foreground": theme.colors.primaryForeground,
    "--color-secondary": theme.colors.secondary,
    "--color-secondary-foreground": theme.colors.secondaryForeground,
    "--color-background": theme.colors.background,
    "--color-surface": theme.colors.surface,
    "--color-text-primary": theme.colors.textPrimary,
    "--color-text-secondary": theme.colors.textSecondary,
    "--color-success": theme.colors.success,
    "--color-warning": theme.colors.warning,
    "--color-danger": theme.colors.danger,
    "--font-family": theme.typography.fontFamily,
  };
}
