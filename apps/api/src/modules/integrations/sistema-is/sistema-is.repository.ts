import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { getSistemaIsConnectionConfig, type Env } from "@rede-is/config";
import type { Appointment, Attendance, Document, HealthUnit, Patient } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import type { PatientSourceRepository } from "../../../common/database/patient-source-repository.interface";

/**
 * Repositório somente-leitura do Sistema IS.
 *
 * TODO(db-mapping): as queries abaixo são placeholders — o mapeamento real
 * de tabelas/colunas será feito junto com o acesso à base (ver
 * ARCHITECTURE.md). Preencha cada método conforme o mapeamento for
 * confirmado, mantendo sempre `SELECT` puro e parâmetros bindados.
 */
@Injectable()
export class SistemaIsRepository implements PatientSourceRepository, OnModuleDestroy {
  private readonly pool: ReadOnlyPool;

  constructor(@Inject(ENV) env: Env) {
    this.pool = new ReadOnlyPool(getSistemaIsConnectionConfig(env));
  }

  async findPatientByCpf(_cpf: string): Promise<Patient | null> {
    // TODO(db-mapping): SELECT ... FROM <tabela_paciente> WHERE cpf = $1
    throw new Error("TODO(db-mapping): mapear tabela de pacientes do Sistema IS");
  }

  async findPatientByContact(_contact: string): Promise<Patient | null> {
    // TODO(db-mapping): buscar por telefone/e-mail cadastrado
    throw new Error("TODO(db-mapping): mapear busca de paciente por contato no Sistema IS");
  }

  async findAppointmentsByPatient(_patientId: string): Promise<Appointment[]> {
    // TODO(db-mapping): SELECT ... FROM <tabela_agendamentos> WHERE paciente_id = $1
    return [];
  }

  async findAttendancesByPatient(_patientId: string): Promise<Attendance[]> {
    // TODO(db-mapping): SELECT ... FROM <tabela_atendimentos> WHERE paciente_id = $1
    return [];
  }

  async findDocumentsByPatient(_patientId: string): Promise<Document[]> {
    // TODO(db-mapping): SELECT ... FROM <tabela_documentos> WHERE paciente_id = $1
    return [];
  }

  async findHealthUnits(): Promise<HealthUnit[]> {
    // TODO(db-mapping): SELECT ... FROM <tabela_unidades_saude>
    return [];
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
