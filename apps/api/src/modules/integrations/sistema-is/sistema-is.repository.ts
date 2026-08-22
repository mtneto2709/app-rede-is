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
   * ATENÇÃO(verificar colunas): confirmado contra o catálogo completo de
   * `sotech.cdg_paciente` (information_schema.columns, 74 colunas) — não
   * existe NENHUMA coluna de telefone/celular/e-mail nessa tabela. O
   * Sistema IS parece genuinamente não guardar contato do paciente (é um
   * sistema de retaguarda hospitalar/farmácia, não voltado a autoatendimento
   * do cidadão). Se não houver uma tabela separada de contato ligada por
   * `pkpaciente`, o Sistema IS nunca vai conseguir localizar um candidato
   * pelo telefone/e-mail do login — só o e-SUS PEC serve pra esse primeiro
   * passo, e o Sistema IS entra apenas depois, via getIdentityProfile, para
   * complementar/validar dados de quem já foi achado no e-SUS.
   */
  async findIdentityCandidatesByContact(_contact: string): Promise<IdentityCandidate[]> {
    throw new Error(
      "TODO(db-mapping): sotech.cdg_paciente não tem coluna de telefone/e-mail — confirmar se existe tabela de contato separada",
    );
  }

  /**
   * Confirmado contra o catálogo completo de `sotech.cdg_paciente`
   * (information_schema.columns): `mae`/`pai` (nome completo, texto livre),
   * `endereco` (rua/logradouro, texto livre — `numero`/`complemento`/`cep`
   * não são necessários para a pergunta do questionário) e `ativo`.
   * `fknaturalidade` — ATENÇÃO(inferido): assumido como FK para
   * `sotech.tbn_municipio.pkmunicipio`, pela mesma convenção confirmada de
   * `fkcidade` (ver atend_is.sql: `join tbn_municipio m on m.pkmunicipio =
   * p.fkcidade`) — não testado diretamente contra o banco real.
   */
  async getIdentityProfile(sourcePatientId: string): Promise<IdentityProfile | null> {
    const rows = await this.pool.query<{
      pkpaciente: string;
      paciente: string;
      mae: string | null;
      pai: string | null;
      cpf: string | null;
      datanascimento: string | null;
      endereco: string | null;
      bairro: string | null;
      naturalidade: string | null;
    }>(
      `SELECT p.pkpaciente, p.paciente, p.mae, p.pai, p.cpf, p.datanascimento, p.endereco,
              bai.bairro, nat.municipio AS naturalidade
       FROM sotech.cdg_paciente p
       LEFT JOIN sotech.tbn_bairro bai ON bai.pkbairro = p.fkbairro
       LEFT JOIN sotech.tbn_municipio nat ON nat.pkmunicipio = p.fknaturalidade
       WHERE p.pkpaciente = $1`,
      [sourcePatientId],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      sourcePatientId: row.pkpaciente,
      name: row.paciente,
      motherName: row.mae,
      fatherName: row.pai,
      birthDate: row.datanascimento,
      birthCity: row.naturalidade,
      cpf: row.cpf,
      streets: row.endereco ? [row.endereco] : [],
      neighborhoods: row.bairro ? [row.bairro] : [],
      mobilePhones: [],
      emails: [],
    };
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
