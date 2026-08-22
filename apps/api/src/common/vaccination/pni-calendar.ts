/**
 * Calendário Nacional de Vacinação (PNI — Programa Nacional de
 * Imunizações), cobrindo a rotina infantil (0–4 anos) mais alguns marcos
 * de adolescente/adulto jovem (HPV, meningocócica ACWY, um reforço de dT
 * como referência). NÃO cobre grupos especiais (gestantes, povos
 * indígenas, profissionais de saúde, viajantes, imunossuprimidos) nem o
 * reforço decenal de dT ao longo de toda a vida adulta — isso exigiria
 * lógica bem mais elaborada e não foi o pedido original.
 *
 * Não veio de uma tabela específica do e-SUS — é o calendário oficial do
 * Ministério da Saúde (conhecimento geral, estável e igual em qualquer
 * instalação do e-SUS, já que é política pública nacional). O que de fato
 * precisa vir do banco é só QUAIS doses este paciente específico já tomou
 * — ver EsusPecRepository.findAdministeredVaccines.
 */
export interface PniDoseDefinition {
  immunobiologicName: string;
  /**
   * Palavras-chave (maiúsculas, sem acento) para casar com o nome real do
   * imunobiológico vindo do banco. O primeiro item também funciona como
   * chave de agrupamento entre doses da mesma vacina (ver
   * VaccinationService).
   */
  matchKeywords: string[];
  doseLabel: string;
  ageInMonths: number;
}

export const PNI_CALENDAR: PniDoseDefinition[] = [
  { immunobiologicName: "BCG", matchKeywords: ["BCG"], doseLabel: "Dose única", ageInMonths: 0 },
  { immunobiologicName: "Hepatite B", matchKeywords: ["HEPATITE B", "HEP B"], doseLabel: "Dose ao nascer", ageInMonths: 0 },
  { immunobiologicName: "Pentavalente", matchKeywords: ["PENTAVALENTE"], doseLabel: "1ª dose", ageInMonths: 2 },
  { immunobiologicName: "VIP (Poliomielite inativada)", matchKeywords: ["VIP", "POLIOMIELITE INATIVADA"], doseLabel: "1ª dose", ageInMonths: 2 },
  { immunobiologicName: "Pneumocócica 10-valente", matchKeywords: ["PNEUMOCOCICA", "PNEUMO"], doseLabel: "1ª dose", ageInMonths: 2 },
  { immunobiologicName: "Rotavírus", matchKeywords: ["ROTAVIRUS", "VORH"], doseLabel: "1ª dose", ageInMonths: 2 },
  { immunobiologicName: "Meningocócica C", matchKeywords: ["MENINGOCOCICA C", "MENINGO C"], doseLabel: "1ª dose", ageInMonths: 3 },
  { immunobiologicName: "Pentavalente", matchKeywords: ["PENTAVALENTE"], doseLabel: "2ª dose", ageInMonths: 4 },
  { immunobiologicName: "VIP (Poliomielite inativada)", matchKeywords: ["VIP", "POLIOMIELITE INATIVADA"], doseLabel: "2ª dose", ageInMonths: 4 },
  { immunobiologicName: "Pneumocócica 10-valente", matchKeywords: ["PNEUMOCOCICA", "PNEUMO"], doseLabel: "2ª dose", ageInMonths: 4 },
  { immunobiologicName: "Rotavírus", matchKeywords: ["ROTAVIRUS", "VORH"], doseLabel: "2ª dose", ageInMonths: 4 },
  { immunobiologicName: "Meningocócica C", matchKeywords: ["MENINGOCOCICA C", "MENINGO C"], doseLabel: "2ª dose", ageInMonths: 5 },
  { immunobiologicName: "Pentavalente", matchKeywords: ["PENTAVALENTE"], doseLabel: "3ª dose", ageInMonths: 6 },
  { immunobiologicName: "VIP (Poliomielite inativada)", matchKeywords: ["VIP", "POLIOMIELITE INATIVADA"], doseLabel: "3ª dose", ageInMonths: 6 },
  { immunobiologicName: "Febre Amarela", matchKeywords: ["FEBRE AMARELA"], doseLabel: "Dose única", ageInMonths: 9 },
  { immunobiologicName: "Pneumocócica 10-valente", matchKeywords: ["PNEUMOCOCICA", "PNEUMO"], doseLabel: "Reforço", ageInMonths: 12 },
  { immunobiologicName: "Meningocócica C", matchKeywords: ["MENINGOCOCICA C", "MENINGO C"], doseLabel: "Reforço", ageInMonths: 12 },
  { immunobiologicName: "Tríplice Viral", matchKeywords: ["TRIPLICE VIRAL", "SARAMPO"], doseLabel: "1ª dose", ageInMonths: 12 },
  { immunobiologicName: "DTP (Tríplice Bacteriana)", matchKeywords: ["DTP"], doseLabel: "1º reforço", ageInMonths: 15 },
  { immunobiologicName: "VOP (Poliomielite oral)", matchKeywords: ["VOP", "POLIOMIELITE ORAL"], doseLabel: "1º reforço", ageInMonths: 15 },
  { immunobiologicName: "Hepatite A", matchKeywords: ["HEPATITE A", "HEP A"], doseLabel: "Dose única", ageInMonths: 15 },
  { immunobiologicName: "Tetra Viral", matchKeywords: ["TETRA VIRAL", "VARICELA"], doseLabel: "Dose (Tríplice Viral + Varicela)", ageInMonths: 15 },
  { immunobiologicName: "DTP (Tríplice Bacteriana)", matchKeywords: ["DTP"], doseLabel: "2º reforço", ageInMonths: 48 },
  { immunobiologicName: "VOP (Poliomielite oral)", matchKeywords: ["VOP", "POLIOMIELITE ORAL"], doseLabel: "2º reforço", ageInMonths: 48 },
  { immunobiologicName: "HPV", matchKeywords: ["HPV"], doseLabel: "1ª dose", ageInMonths: 108 },
  { immunobiologicName: "HPV", matchKeywords: ["HPV"], doseLabel: "2ª dose", ageInMonths: 114 },
  { immunobiologicName: "Meningocócica ACWY", matchKeywords: ["MENINGOCOCICA ACWY", "MENINGO ACWY"], doseLabel: "Dose (adolescente)", ageInMonths: 132 },
  { immunobiologicName: "dT (Dupla Adulto)", matchKeywords: ["DT ", "DUPLA ADULTO"], doseLabel: "Reforço", ageInMonths: 180 },
];
