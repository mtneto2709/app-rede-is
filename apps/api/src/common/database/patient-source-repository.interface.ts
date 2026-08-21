import type {
  Appointment,
  Attendance,
  Document,
  HealthUnit,
  Patient,
} from "@rede-is/shared-types";

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
}
