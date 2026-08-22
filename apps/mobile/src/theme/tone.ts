import type { TenantTheme } from "@rede-is/theme-tokens";

/**
 * Espelha `apps/web/src/lib/tone.ts` — distribui as cores semânticas do
 * tema do tenant (nunca cor fixa) pra dar identidade visual a grades de
 * serviços, alertas e documentos sem quebrar o white-label.
 */
export function toneColors(theme: TenantTheme): string[] {
  return [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.success,
    theme.colors.warning,
    theme.colors.danger,
  ];
}

export function toneColorAt(theme: TenantTheme, index: number): string {
  const colors = toneColors(theme);
  return colors[index % colors.length] as string;
}

/** Cor + alfa em hex (`RRGGBBAA`) pra fundo pastel de badges/ícones. */
export function withAlpha(hexColor: string, alphaHex: string): string {
  return `${hexColor}${alphaHex}`;
}
