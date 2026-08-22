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
 * `sotech.cdg_paciente` (nome, CPF, CNS, nascimento, mãe, pai, endereço,
 * bairro via `sotech.tbn_bairro`, naturalidade via `sotech.tbn_municipio`)
 * e `sotech.cdg_contato` (telefone/e-mail, ligado por `fkpaciente`) mapeados
 * a partir do DDL real das tabelas e de queries reais de um projeto de BI
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
   * `sotech.cdg_paciente` não tem coluna de contato — fica em
   * `sotech.cdg_contato` (confirmado pelo DDL real: `fkpaciente` indexado,
   * FK para `cdg_paciente.pkpaciente`, com `celular1`/`celular2`/`email` e
   * flag `ativo`). A mesma tabela também guarda contato de
   * `cdg_interveniente` (profissionais) via `fkinterveniente` — por isso o
   * filtro `fkpaciente IS NOT NULL`, para nunca casar contato de um
   * profissional com uma busca de paciente.
   */
  async findIdentityCandidatesByContact(contact: string): Promise<IdentityCandidate[]> {
    const digits = contact.replace(/\D/g, "");
    const isEmail = contact.includes("@");

    const rows = await this.pool.query<{ pkpaciente: string; paciente: string }>(
      isEmail
        ? `SELECT DISTINCT p.pkpaciente, p.paciente
           FROM sotech.cdg_contato c
           INNER JOIN sotech.cdg_paciente p ON p.pkpaciente = c.fkpaciente
           WHERE c.ativo = true AND p.ativo = true AND c.fkpaciente IS NOT NULL
             AND lower(c.email) = lower($1)`
        : `SELECT DISTINCT p.pkpaciente, p.paciente
           FROM sotech.cdg_contato c
           INNER JOIN sotech.cdg_paciente p ON p.pkpaciente = c.fkpaciente
           WHERE c.ativo = true AND p.ativo = true AND c.fkpaciente IS NOT NULL AND (
             regexp_replace(coalesce(c.celular1, ''), '\\D', '', 'g') = $1
             OR regexp_replace(coalesce(c.celular2, ''), '\\D', '', 'g') = $1
           )`,
      [isEmail ? contact : digits],
    );

    return rows.map((r) => ({ sourcePatientId: r.pkpaciente, name: r.paciente }));
  }

  /**
   * Confirmado contra o DDL real de `sotech.cdg_paciente` (create table +
   * comentários de coluna): `mae`/`pai` (nome completo, texto livre),
   * `endereco` (rua/logradouro, texto livre — `numero`/`complemento`/`cep`
   * não são necessários para a pergunta do questionário) e `fknaturalidade`
   * → `sotech.tbn_municipio.pkmunicipio` (confirmado pelo comentário da
   * própria coluna, mesma tabela de `fkcidade`). Telefone/e-mail vêm de
   * `sotech.cdg_contato` (ver findIdentityCandidatesByContact) — agregados
   * via subquery lateral porque um paciente pode ter mais de um registro de
   * contato ativo.
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
      celulares: string[] | null;
      emails: string[] | null;
    }>(
      `SELECT p.pkpaciente, p.paciente, p.mae, p.pai, p.cpf, p.datanascimento, p.endereco,
              bai.bairro, nat.municipio AS naturalidade,
              cel.celulares, mails.emails
       FROM sotech.cdg_paciente p
       LEFT JOIN sotech.tbn_bairro bai ON bai.pkbairro = p.fkbairro
       LEFT JOIN sotech.tbn_municipio nat ON nat.pkmunicipio = p.fknaturalidade
       LEFT JOIN LATERAL (
         SELECT array_agg(DISTINCT v) AS celulares
         FROM sotech.cdg_contato c, LATERAL (VALUES (c.celular1), (c.celular2)) AS t(v)
         WHERE c.fkpaciente = p.pkpaciente AND c.ativo = true AND v IS NOT NULL
       ) cel ON true
       LEFT JOIN LATERAL (
         SELECT array_agg(DISTINCT c.email) AS emails
         FROM sotech.cdg_contato c
         WHERE c.fkpaciente = p.pkpaciente AND c.ativo = true AND c.email IS NOT NULL
       ) mails ON true
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
      mobilePhones: row.celulares ?? [],
      emails: row.emails ?? [],
    };
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
