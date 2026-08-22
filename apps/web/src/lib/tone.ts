/**
 * Paleta de "tons" derivada das cores semânticas do tema do tenant
 * (nunca cor fixa) — usada para dar identidade visual (ícones em
 * badge colorido, bordas, caixas de destaque) a grades de serviços,
 * alertas e documentos sem quebrar o white-label.
 */
export type Tone = "primary" | "secondary" | "success" | "warning" | "danger";

export const TONE_BG: Record<Tone, string> = {
  primary: "bg-primary/10",
  secondary: "bg-secondary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
};

export const TONE_TEXT: Record<Tone, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export const TONE_BORDER: Record<Tone, string> = {
  primary: "border-l-primary",
  secondary: "border-l-secondary",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
};

const CYCLE: Tone[] = ["primary", "secondary", "success", "warning", "danger"];

/** Distribui os tons de forma cíclica pra listas de tamanho variável. */
export function toneAt(index: number): Tone {
  return CYCLE[index % CYCLE.length] as Tone;
}
