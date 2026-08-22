import type {
  Appointment,
  Attendance,
  Document,
  HealthUnit,
  Patient,
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
}
