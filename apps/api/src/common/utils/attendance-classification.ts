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
