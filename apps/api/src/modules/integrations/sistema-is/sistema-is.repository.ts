import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { getSistemaIsConnectionConfig, type Env } from "@rede-is/config";
import type { Appointment, Attendance, Document, HealthUnit, Patient } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import type {
  IdentityCandidate,
  IdentityProfile,
  PatientSourceRepository,
} from "../../../common/database/patient-source-repository.interface";

/**
 * Repositório somente-leitura do Sistema IS.
 *
 * `sotech.cdg_paciente` (nome, CPF, CNS, nascimento, bairro via
 * `sotech.tbn_bairro`) confirmado contra queries reais de um projeto de BI
 * do mesmo cliente que já usa essa base em produção. `findPatientByCpf`,
 * `findAppointmentsByPatient` etc. abaixo continuam placeholders — mapear
 * cada um conforme for confirmado, mantendo sempre `SELECT` puro e
 * parâmetros bindados.
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

  /**
   * ATENÇÃO(verificar colunas): tabela e colunas de nome/CPF/CNS/nascimento
   * confirmadas a partir de queries reais em produção (projeto de BI de
   * estoque/atendimento do mesmo cliente, que já consulta
   * `sotech.cdg_paciente` extensivamente). O que NÃO está confirmado ainda
   * é telefone/e-mail: esse BI nunca precisou de contato do paciente
   * (só estoque e indicadores agregados), então essas colunas não aparecem
   * em nenhuma query existente. Falta o nome real da(s) coluna(s) de
   * telefone/celular/e-mail em `sotech.cdg_paciente` (ou confirmar que o
   * Sistema IS não guarda contato do paciente, e a busca por contato
   * dependeria só do e-SUS PEC para esse caso).
   */
  async findIdentityCandidatesByContact(_contact: string): Promise<IdentityCandidate[]> {
    throw new Error(
      "TODO(db-mapping): coluna(s) de telefone/e-mail em sotech.cdg_paciente ainda não confirmadas",
    );
  }

  /**
   * ATENÇÃO(verificar colunas): confirmado contra queries reais em produção
   * — `sotech.cdg_paciente` (pkpaciente, paciente, cpf, cns, datanascimento,
   * fkbairro, fksexo) e `sotech.tbn_bairro` (pkbairro, bairro) para o bairro
   * de residência. motherName/fatherName/birthCity/streets/mobilePhones/
   * emails continuam null/vazios — nenhuma query do BI de referência toca
   * nesses campos (só estoque/indicadores agregados, não cadastro completo).
   */
  async getIdentityProfile(sourcePatientId: string): Promise<IdentityProfile | null> {
    const rows = await this.pool.query<{
      pkpaciente: string;
      paciente: string;
      cpf: string | null;
      datanascimento: string | null;
      bairro: string | null;
    }>(
      `SELECT p.pkpaciente, p.paciente, p.cpf, p.datanascimento, bai.bairro
       FROM sotech.cdg_paciente p
       LEFT JOIN sotech.tbn_bairro bai ON bai.pkbairro = p.fkbairro
       WHERE p.pkpaciente = $1`,
      [sourcePatientId],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      sourcePatientId: row.pkpaciente,
      name: row.paciente,
      motherName: null,
      fatherName: null,
      birthDate: row.datanascimento,
      birthCity: null,
      cpf: row.cpf,
      streets: [],
      neighborhoods: row.bairro ? [row.bairro] : [],
      mobilePhones: [],
      emails: [],
    };
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
