import type {
  AllergyEntry,
  Appointment,
  Attendance,
  ContinuousMedication,
  Document,
  ExamResult,
  HealthCondition,
  HealthUnit,
  Patient,
  VitalMeasurements,
} from "@rede-is/shared-types";

/** Resultado resumido de uma busca por contato — usado para desambiguar quando o mesmo telefone/e-mail está em mais de um cadastro. */
export interface IdentityCandidate {
  sourcePatientId: string;
  name: string;
}

/**
 * Dados de identidade usados para montar o questionário de primeiro
 * acesso. Vem sempre de uma base somente-leitura — nunca é persistido no
 * banco de controle além do necessário para conferir a resposta.
 */
export interface IdentityProfile {
  sourcePatientId: string;
  name: string;
  motherName: string | null;
  fatherName: string | null;
  birthDate: string | null; // ISO 8601 (yyyy-mm-dd)
  birthCity: string | null;
  cpf: string | null;
  /** Ruas onde mora ou já morou, conforme histórico disponível na base. */
  streets: string[];
  /** Bairros onde mora ou já morou. */
  neighborhoods: string[];
  mobilePhones: string[];
  emails: string[];
}

/** Resultado de `getHealthSummary` — `available: false` quando nada foi mapeado ainda nessa base (ver HealthSummary em shared-types). */
export interface HealthSummaryResult {
  available: boolean;
  conditions: HealthCondition[];
  medications: ContinuousMedication[];
  exams: ExamResult[];
  allergies: AllergyEntry[];
  measurements: VitalMeasurements | null;
}

/**
 * Contrato implementado tanto pelo repositório do Sistema IS quanto pelo do
 * e-SUS PEC, para que `PatientsService` possa consultar as duas bases de
 * forma uniforme e mesclar os resultados. Todo método é somente leitura.
 */
export interface PatientSourceRepository {
  findPatientByCpf(cpf: string): Promise<Patient | null>;
  findPatientByContact(contact: string): Promise<Patient | null>;
  findAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  findAttendancesByPatient(patientId: string): Promise<Attendance[]>;
  findDocumentsByPatient(patientId: string): Promise<Document[]>;
  findHealthUnits(): Promise<HealthUnit[]>;

  /** Todos os cadastros cujo telefone OU e-mail bate com o contato informado. */
  findIdentityCandidatesByContact(contact: string): Promise<IdentityCandidate[]>;
  /** Perfil completo de identidade de um cadastro específico, para gerar o questionário. */
  getIdentityProfile(sourcePatientId: string): Promise<IdentityProfile | null>;
  /**
   * Número do CNS (Cartão Nacional de Saúde) do paciente, para a tela de
   * Meus Cartões. Isolado de `getIdentityProfile` de propósito: a coluna
   * usada aqui não está confirmada em nenhuma das duas bases (ver comentário
   * na implementação), então cada repositório deve capturar erro de query
   * internamente e devolver `null` em vez de propagar — se o nome da coluna
   * estiver errado, só o número do cartão fica ausente, sem derrubar login,
   * dashboard ou questionário (que usam `getIdentityProfile`, não este).
   */
  getPatientCns(sourcePatientId: string): Promise<string | null>;
  /** Comorbidades, medicamentos de uso contínuo e resultados de exame — ver HealthSummaryResult. */
  getHealthSummary(sourcePatientId: string): Promise<HealthSummaryResult>;
}
