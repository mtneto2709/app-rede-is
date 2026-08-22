import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { getEsusPecConnectionConfig, type Env } from "@rede-is/config";
import type { Appointment, Attendance, Document, HealthUnit, Patient } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import type {
  IdentityCandidate,
  IdentityProfile,
  PatientSourceRepository,
} from "../../../common/database/patient-source-repository.interface";

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

  /**
   * ATENÇÃO(verificar colunas): escrito com base no schema público padrão
   * do e-SUS PEC (`public.tb_cidadao`), mas cada instalação pode ter
   * customizações. Confirme os nomes de coluna antes de considerar isso
   * definitivo — em especial `nu_telefone_celular`/`nu_telefone_contato`
   * (o nome pode variar) e se `ds_email` de fato existe nesta instalação.
   */
  async findIdentityCandidatesByContact(contact: string): Promise<IdentityCandidate[]> {
    const digits = contact.replace(/\D/g, "");
    const isEmail = contact.includes("@");

    const rows = await this.pool.query<{ co_seq_cidadao: string; no_cidadao: string }>(
      isEmail
        ? `SELECT co_seq_cidadao, no_cidadao FROM public.tb_cidadao WHERE lower(ds_email) = lower($1) AND st_ativo = 1`
        : `SELECT co_seq_cidadao, no_cidadao FROM public.tb_cidadao
           WHERE st_ativo = 1 AND (
             regexp_replace(coalesce(nu_telefone_celular, ''), '\\D', '', 'g') = $1
             OR regexp_replace(coalesce(nu_telefone_contato, ''), '\\D', '', 'g') = $1
           )`,
      [isEmail ? contact : digits],
    );

    return rows.map((r) => ({ sourcePatientId: r.co_seq_cidadao, name: r.no_cidadao }));
  }

  /** ATENÇÃO(verificar colunas): ver observação em findIdentityCandidatesByContact. */
  async getIdentityProfile(sourcePatientId: string): Promise<IdentityProfile | null> {
    const rows = await this.pool.query<{
      co_seq_cidadao: string;
      no_cidadao: string;
      no_mae: string | null;
      no_pai: string | null;
      dt_nascimento: string | null;
      nu_cpf: string | null;
      nu_telefone_celular: string | null;
      nu_telefone_contato: string | null;
      ds_email: string | null;
    }>(
      `SELECT co_seq_cidadao, no_cidadao, no_mae, no_pai, dt_nascimento, nu_cpf,
              nu_telefone_celular, nu_telefone_contato, ds_email
       FROM public.tb_cidadao WHERE co_seq_cidadao = $1`,
      [sourcePatientId],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      sourcePatientId: row.co_seq_cidadao,
      name: row.no_cidadao,
      motherName: row.no_mae,
      fatherName: row.no_pai,
      birthDate: row.dt_nascimento,
      // TODO(db-mapping): cidade de nascimento normalmente fica em
      // co_municipio_nascimento (FK para tabela de municípios do IBGE) —
      // precisa de um JOIN para trazer o nome. Confirmar tabela/coluna.
      birthCity: null,
      cpf: row.nu_cpf,
      // TODO(db-mapping): rua/bairro geralmente ficam em uma tabela de
      // domicílio ligada por família (tb_domicilio/tb_familia), não direto
      // em tb_cidadao — confirmar o relacionamento antes de implementar.
      streets: [],
      neighborhoods: [],
      mobilePhones: [row.nu_telefone_celular, row.nu_telefone_contato].filter((v): v is string => !!v),
      emails: row.ds_email ? [row.ds_email] : [],
    };
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
