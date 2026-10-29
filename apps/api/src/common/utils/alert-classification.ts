/**
 * `mensagens.msg_tipoalerta.tipoalerta` é texto livre, sem um enum fechado
 * batendo com o `Alert.type` do app — classifica por palavra-chave, mesmo
 * padrão já usado pra tipo de unidade de saúde e tipo de atendimento.
 */
export function classifyAlertType(
  tipoalerta: string | null,
): "medication" | "appointment" | "vaccine" | "exam" | "other" {
  if (!tipoalerta) return "other";
  const normalized = tipoalerta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  if (/MEDICAMENTO|MEDICACAO/.test(normalized)) return "medication";
  if (/CONSULTA|AGENDA/.test(normalized)) return "appointment";
  if (/VACIN/.test(normalized)) return "vaccine";
  if (/EXAME/.test(normalized)) return "exam";
  return "other";
}
