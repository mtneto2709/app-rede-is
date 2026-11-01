/**
 * Classificação de problema/condição diagnosticado em atendimento (CIAP2,
 * `tb_problema.co_ciap` -> `tb_ciap.co_ciap`) pro rótulo padronizado exibido
 * em "Problemas e condições" — lista fechada CONFIRMADA pelo cliente (só
 * esses 15 códigos; qualquer outro CIAP, ou diagnóstico só por CID10/texto
 * livre, fica fora desta seção por ora).
 */
const CIAP_CONDITION_MAP: Record<string, string> = {
  K86: "Hipertensão",
  K87: "Hipertensão",
  T90: "Diabetes",
  K77: "Doença cardíaca",
  K74: "Doença cardíaca",
  K84: "Doença cardíaca",
  K90: "AVC / Derrame",
  K75: "Infarto",
  R96: "Doença respiratória / no pulmão",
  R95: "Doença respiratória / no pulmão",
  R99: "Doença respiratória / no pulmão",
  U99: "Problemas nos rins",
  A79: "Câncer",
  A70: "Tuberculose",
  A78: "Hanseníase",
};

export function classifyDiagnosedCondition(ciapCode: string | null): string | null {
  if (!ciapCode) return null;
  return CIAP_CONDITION_MAP[ciapCode.trim().toUpperCase()] ?? null;
}
