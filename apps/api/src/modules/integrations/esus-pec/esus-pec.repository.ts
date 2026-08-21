import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { getEsusPecConnectionConfig, type Env } from "@rede-is/config";
import type { Appointment, Attendance, Document, HealthUnit, Patient } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import type { PatientSourceRepository } from "../../../common/database/patient-source-repository.interface";

/**
 * Repositório somente-leitura do e-SUS PEC.
 *
 * TODO(db-mapping): mesma observação do SistemaIsRepository — o schema real
 * do e-SUS PEC (tabelas `tb_cidadao`, `tb_atendimento_domiciliar`, etc. na
 * instalação padrão, mas cada município pode customizar) será mapeado
 * junto com você.
 */
@Injectable()
export class EsusPecRepository implements PatientSourceRepository, OnModuleDestroy {
  private readonly pool: ReadOnlyPool;

  constructor(@Inject(ENV) env: Env) {
    this.pool = new ReadOnlyPool(getEsusPecConnectionConfig(env));
  }

  async findPatientByCpf(_cpf: string): Promise<Patient | null> {
    // TODO(db-mapping): SELECT ... FROM tb_cidadao WHERE ds_cpf = $1
    throw new Error("TODO(db-mapping): mapear tabela de cidadãos do e-SUS PEC");
  }

  async findPatientByContact(_contact: string): Promise<Patient | null> {
    // TODO(db-mapping): buscar por telefone/e-mail cadastrado
    throw new Error("TODO(db-mapping): mapear busca de cidadão por contato no e-SUS PEC");
  }

  async findAppointmentsByPatient(_patientId: string): Promise<Appointment[]> {
    // TODO(db-mapping): SELECT ... FROM <tabela_agenda> WHERE co_cidadao = $1
    return [];
  }

  async findAttendancesByPatient(_patientId: string): Promise<Attendance[]> {
    // TODO(db-mapping): SELECT ... FROM <tabela_atendimento> WHERE co_cidadao = $1
    return [];
  }

  async findDocumentsByPatient(_patientId: string): Promise<Document[]> {
    // TODO(db-mapping): mapear documentos/prescrições no e-SUS PEC
    return [];
  }

  async findHealthUnits(): Promise<HealthUnit[]> {
    // TODO(db-mapping): SELECT ... FROM tb_estabelecimento
    return [];
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
