import type { AttendanceCategory } from "@rede-is/shared-types";

/**
 * Nenhuma das duas bases (e-SUS PEC / Sistema IS) tem uma coluna que já
 * venha pronta como "consultation" | "emergency" | "routine" (Attendance)
 * ou "consultation" | "exam" | "procedure" | "vaccination" (Appointment) —
 * o que existe é um texto livre de tipo de atendimento (`no_tipo_atend` no
 * e-SUS, `tipoatendimento` no Sistema IS). Classifica por palavra-chave,
 * com fallback seguro para "consultation" quando nada bate.
 */
export function classifyAttendanceType(label: string | null): "consultation" | "emergency" | "routine" {
  if (!label) return "consultation";
  const normalized = label.toLowerCase();
  if (/urg|emerg|pronto.?socorro/.test(normalized)) return "emergency";
  if (/rotina|prevent|acompanhamento|puericultura/.test(normalized)) return "routine";
  return "consultation";
}

export function classifyAppointmentType(label: string | null): "consultation" | "exam" | "procedure" | "vaccination" {
  if (!label) return "consultation";
  const normalized = label.toLowerCase();
  if (/vacin|imuniza/.test(normalized)) return "vaccination";
  if (/exame|laborat|radiolog/.test(normalized)) return "exam";
  if (/procediment|curativ|cirurg/.test(normalized)) return "procedure";
  return "consultation";
}

/**
 * Classifica o status de um agendamento (`tb_situacao_agendado.no_situacao_agendado`
 * no e-SUS PEC) por palavra-chave — não tenho a lista fechada dos valores
 * possíveis dessa tabela de domínio, então trato como texto livre igual
 * aos outros classificadores desta função. Fallback seguro para
 * "scheduled" (é o caso mais comum pra agendamento futuro e o que gera
 * menos informação errada se o texto não bater com nada).
 */
export function classifyAppointmentStatus(label: string | null): "scheduled" | "completed" | "cancelled" | "missed" {
  if (!label) return "scheduled";
  const normalized = label.toLowerCase();
  if (/cancel/.test(normalized)) return "cancelled";
  if (/falt|n[aã]o compare|ausente/.test(normalized)) return "missed";
  if (/atendid|realizad|finalizad|compareceu|presente/.test(normalized)) return "completed";
  return "scheduled";
}

/**
 * Categoria visual de um atendimento (ícone + cor do card) a partir do
 * texto de tipo de atendimento profissional (`tb_tipo_atend_prof.no_tipo_atend_prof`
 * no e-SUS, `tipoatendimento` no Sistema IS) — mesma técnica de
 * palavra-chave dos outros classificadores. Fallback pra "other" (ícone e
 * cor genéricos) quando nada bate ou o texto vem nulo.
 */
export function classifyAttendanceCategory(label: string | null): AttendanceCategory {
  if (!label) return "other";
  const normalized = label.toLowerCase();
  if (/pr[eé].?natal|gestante/.test(normalized)) return "prenatal";
  if (/domiciliar|territorial/.test(normalized)) return "homeVisit";
  if (/vacin|imuniza/.test(normalized)) return "vaccination";
  if (/odont/.test(normalized)) return "dental";
  if (/puericultura|crian[çc]a/.test(normalized)) return "childCare";
  if (/exame|laborat|radiolog/.test(normalized)) return "exam";
  if (/curativ/.test(normalized)) return "dressing";
  if (/grupo|coletiv/.test(normalized)) return "group";
  if (/procediment|cirurg/.test(normalized)) return "procedure";
  if (/consulta/.test(normalized)) return "consultation";
  return "other";
}
