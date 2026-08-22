/**
 * Nenhuma tabela de unidade de saúde confirmada até agora expôs uma coluna
 * de tipo (UBS/hospital/clínica/laboratório) — classifica por
 * palavra-chave no próprio nome da unidade, que no Brasil quase sempre
 * entrega essa informação (ex.: "UBS FULANO", "HOSPITAL MUNICIPAL X").
 */
export function classifyHealthUnitType(
  name: string,
): "ubs" | "hospital" | "clinic" | "laboratory" | "other" {
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  if (/HOSPITAL|MATERNIDADE|PRONTO.?SOCORRO|\bUPA\b/.test(normalized)) return "hospital";
  if (/LABORAT/.test(normalized)) return "laboratory";
  if (/CLINICA/.test(normalized)) return "clinic";
  if (/\bUBS\b|POSTO DE SAUDE|CENTRO DE SAUDE|UNIDADE BASICA/.test(normalized)) return "ubs";
  return "other";
}
