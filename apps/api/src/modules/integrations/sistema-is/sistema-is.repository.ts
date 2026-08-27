import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { getSistemaIsConnectionConfig, type Env } from "@rede-is/config";
import type { Appointment, Attendance, Document, HealthUnit, Patient } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import {
  classifyAppointmentType,
  classifyAttendanceCategory,
  classifyAttendanceType,
} from "../../../common/utils/attendance-classification";
import type {
  HealthSummaryResult,
  IdentityCandidate,
  IdentityProfile,
  PatientSourceRepository,
} from "../../../common/database/patient-source-repository.interface";

/**
 * Repositório somente-leitura do Sistema IS.
 *
 * `sotech.cdg_paciente` (nome, CPF, CNS, nascimento, mãe, pai, endereço,
 * bairro via `sotech.tbn_bairro`, naturalidade via `sotech.tbn_municipio`),
 * `sotech.cdg_contato` (telefone/e-mail, ligado por `fkpaciente`) e
 * `sotech.ate_atendimento` (histórico de atendimentos, incl. internações)
 * mapeados a partir do DDL real das tabelas e de queries reais de um
 * projeto de BI do mesmo cliente que já usa essa base em produção.
 * `findPatientByCpf`, `findDocumentsByPatient`, `findHealthUnits` etc.
 * continuam placeholders — mapear cada um conforme for confirmado,
 * mantendo sempre `SELECT` puro e parâmetros bindados.
 */
@Injectable()
export class SistemaIsRepository implements PatientSourceRepository, OnModuleDestroy {
  private readonly logger = new Logger(SistemaIsRepository.name);
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

  /**
   * ATENÇÃO(sem dado de agenda futura): mesma observação do
   * EsusPecRepository — não há, na referência disponível, tabela de
   * agendamento futuro do Sistema IS mapeada. Diferente do e-SUS PEC (que é
   * open-source), o Sistema IS é proprietário e não tem documentação
   * técnica pública pra pesquisar — precisa que o cliente confirme a
   * tabela real (mesmo padrão usado pra `cdg_paciente`/`cdg_contato`: DDL
   * ou um `information_schema.columns` filtrando por "agenda"). Devolve o
   * histórico de atendimentos já realizados com status "completed"
   * enquanto isso não é mapeado.
   */
  async findAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    const rows = await this.findAttendanceRows(patientId);
    return rows.map((row) => ({
      id: row.pkatendimento,
      patientId,
      professionalName: row.interveniente,
      specialty: row.especialidade,
      scheduledAt: row.dataentrada,
      status: "completed" as const,
      type: classifyAppointmentType(row.tipoatendimento),
      healthUnitId: row.fkunidadesaude,
      sourceSystem: "sistema-is" as const,
    }));
  }

  /**
   * Confirmado contra uma query real em produção (mesma referência de
   * getIdentityProfile) — `sotech.ate_atendimento` + `cdg_unidadesaude` +
   * `tbn_especialidade` + `cdg_interveniente` + `tbl_tipoatendimento`.
   * Inclui internações (fktipoatendimento = 2) junto com os demais tipos de
   * atendimento — são atendimentos de verdade, fazem parte do histórico.
   * `diagnosis`/`prescription` ficam null: `ate_atendimento` tem
   * `fkcidprincipal`/`fkcidsecundario`, mas a tabela de CID
   * (`sotech.tbn_cid`) não teve sua coluna de descrição confirmada ainda.
   */
  async findAttendancesByPatient(patientId: string): Promise<Attendance[]> {
    const rows = await this.findAttendanceRows(patientId);
    return rows.map((row) => ({
      id: row.pkatendimento,
      patientId,
      professionalName: row.interveniente,
      specialty: row.especialidade,
      occurredAt: row.dataentrada,
      diagnosis: null,
      ciap2: null,
      prescription: null,
      healthUnitId: row.fkunidadesaude,
      // TODO(db-mapping): `sotech.cdg_unidadesaude` está confirmada como
      // existente (usada em cdg_paciente/cdg_contato), mas eu não tenho as
      // colunas de nome/PK dela ainda — sem isso não dá pra resolver
      // fkunidadesaude num nome pra mostrar no card.
      healthUnitName: null,
      typeLabel: row.tipoatendimento,
      category: classifyAttendanceCategory(row.tipoatendimento),
      type: classifyAttendanceType(row.tipoatendimento),
      sourceSystem: "sistema-is" as const,
    }));
  }

  private async findAttendanceRows(patientId: string): Promise<
    {
      pkatendimento: string;
      dataentrada: string;
      fkunidadesaude: string | null;
      interveniente: string | null;
      especialidade: string | null;
      tipoatendimento: string | null;
    }[]
  > {
    return this.pool.query(
      `SELECT a.pkatendimento::text AS pkatendimento, a.dataentrada, a.fkunidadesaude::text AS fkunidadesaude,
              prof.interveniente, esp.especialidade, ta.tipoatendimento
       FROM sotech.ate_atendimento a
       LEFT JOIN sotech.tbn_especialidade esp ON esp.pkespecialidade = a.fkespecialidade
       LEFT JOIN sotech.cdg_interveniente prof ON prof.pkinterveniente = a.fkprofissionalatendimento
       LEFT JOIN sotech.tbl_tipoatendimento ta ON ta.pktipoatendimento = a.fktipoatendimento
       WHERE a.fkpaciente = $1 AND coalesce(a.ativo, true) = true
       ORDER BY a.dataentrada DESC NULLS LAST
       LIMIT 200`,
      [patientId],
    );
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

  /**
   * ATENÇÃO(coluna não confirmada): não tenho o nome exato da coluna de CNS
   * em `sotech.cdg_paciente` — o comentário no topo deste arquivo registra
   * que o DDL real da tabela tinha uma coluna de CNS (visto em sessão
   * anterior), mas o texto do DDL em si não ficou salvo no repositório.
   * `cns` é o melhor palpite, seguindo o mesmo padrão curto de `cpf` nessa
   * tabela — mas é só palpite. Isolado com try/catch: se o nome estiver
   * errado, só o número do cartão fica ausente na tela de Cartões.
   */
  async getPatientCns(sourcePatientId: string): Promise<string | null> {
    try {
      const rows = await this.pool.query<{ cns: string | null }>(
        `SELECT cns FROM sotech.cdg_paciente WHERE pkpaciente = $1`,
        [sourcePatientId],
      );
      return rows[0]?.cns ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar CNS (coluna não confirmada) do paciente ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  /**
   * TODO(db-mapping): Sistema IS é proprietário, sem documentação técnica
   * pública — precisa que o cliente confirme se/onde comorbidades,
   * medicamento de uso contínuo e resultado de exame são registrados
   * (mesmo padrão usado pra `cdg_paciente`/`cdg_contato`: DDL ou
   * information_schema.columns).
   */
  async getHealthSummary(_sourcePatientId: string): Promise<HealthSummaryResult> {
    return { available: false, conditions: [], medications: [], exams: [] };
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
