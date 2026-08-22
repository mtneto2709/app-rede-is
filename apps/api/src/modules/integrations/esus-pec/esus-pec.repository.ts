import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { getEsusPecConnectionConfig, type Env } from "@rede-is/config";
import type { Appointment, Attendance, Document, HealthUnit, Patient } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import { classifyAppointmentType, classifyAttendanceType } from "../../../common/utils/attendance-classification";
import { classifyHealthUnitType } from "../../../common/utils/health-unit-classification";
import type {
  IdentityCandidate,
  IdentityProfile,
  PatientSourceRepository,
} from "../../../common/database/patient-source-repository.interface";

/**
 * Uma entrada do calendário vacinal do e-SUS (`tb_calendario_vacinal` +
 * `tb_regra_vacinal_estrategia` + `tb_faixa_etaria_vacinacao`) — usado só
 * por VaccinationService, não faz parte do contrato compartilhado
 * (vacinação hoje é e-SUS PEC apenas).
 */
export interface VaccinationCalendarSlot {
  immunobiologicId: string;
  immunobiologicName: string;
  doseId: string;
  doseLabel: string;
  /** Dias desde o nascimento em que a dose é recomendada — null quando não há regra de faixa etária associada. */
  ageStartDays: number | null;
}

/** Uma dose de vacina administrada, já casada com o imunobiológico/dose do catálogo quando possível. */
export interface AdministeredVaccine {
  immunobiologicId: string | null;
  immunobiologicName: string;
  doseId: string | null;
  doseLabel: string | null;
  administeredAt: string;
  healthUnitName: string | null;
  professionalName: string | null;
}

/**
 * Repositório somente-leitura do e-SUS PEC.
 *
 * `public.tb_atend`/`tb_atend_prof`/`tb_prontuario` (histórico de
 * atendimentos) e `public.tb_unidade_saude` (nome das unidades) mapeados a
 * partir de uma query real em produção (projeto de BI de estoque/
 * atendimento do mesmo cliente — ver SistemaIsRepository/questionário).
 * `findVaccinationCalendar`/`findAdministeredVaccines` confirmados contra o
 * catálogo real de colunas do schema de vacinação (information_schema —
 * tb_calendario_vacinal, tb_regra_vacinal_estrategia,
 * tb_faixa_etaria_vacinacao, tb_imunobiologico, tb_dose_imunobiologico,
 * tb_vacinacao, tb_registro_vacinacao). `findPatientByCpf`,
 * `findDocumentsByPatient` etc. continuam placeholders.
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

  /**
   * ATENÇÃO(sem dado de agenda futura): não há, na referência disponível,
   * nenhuma tabela de agendamento/agenda futura do e-SUS PEC mapeada (o
   * módulo de agenda da equipe é bem mais complexo — regras de recorrência,
   * cotas por profissional etc.). Enquanto isso não for mapeado, devolve o
   * histórico de atendimentos JÁ REALIZADOS com status "completed" — dá pra
   * tela de agendamentos mostrar consultas passadas reais em vez de ficar
   * vazia, mas nenhuma consulta futura ainda marcada aparece aqui.
   */
  async findAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    const rows = await this.findAttendanceRows(patientId);
    return rows.map((row) => ({
      id: row.co_seq_atend_prof,
      patientId,
      professionalName: row.no_civil_profissional,
      specialty: row.no_cbo,
      scheduledAt: row.dt_inicio,
      status: "completed" as const,
      type: classifyAppointmentType(row.no_tipo_atend),
      healthUnitId: row.co_unidade_saude,
      sourceSystem: "esus-pec" as const,
    }));
  }

  /**
   * Confirmado contra uma query real em produção (mesma referência de
   * `getIdentityProfile`) — `tb_atend` (encontro) + `tb_atend_prof` (um
   * profissional dentro do encontro; a granularidade usada aqui, igual à
   * query original) + `tb_prontuario` (liga ao `co_cidadao`) + CID via
   * `rl_evolucao_avaliacao_ciap_cid`/`tb_cid10`. `prescription` fica null —
   * não há, na referência disponível, uma tabela de prescrição mapeada.
   */
  async findAttendancesByPatient(patientId: string): Promise<Attendance[]> {
    const rows = await this.findAttendanceRows(patientId);
    return rows.map((row) => ({
      id: row.co_seq_atend_prof,
      patientId,
      professionalName: row.no_civil_profissional,
      specialty: row.no_cbo,
      occurredAt: row.dt_inicio,
      diagnosis: row.cid10s && row.cid10s.length > 0 ? row.cid10s.join(", ") : null,
      prescription: null,
      healthUnitId: row.co_unidade_saude,
      type: classifyAttendanceType(row.no_tipo_atend),
      sourceSystem: "esus-pec" as const,
    }));
  }

  private async findAttendanceRows(patientId: string): Promise<
    {
      co_seq_atend_prof: string;
      dt_inicio: string;
      co_unidade_saude: string | null;
      no_civil_profissional: string | null;
      no_cbo: string | null;
      no_tipo_atend: string | null;
      cid10s: string[] | null;
    }[]
  > {
    return this.pool.query(
      `SELECT ap.co_seq_atend_prof::text AS co_seq_atend_prof, ap.dt_inicio, a.co_unidade_saude::text AS co_unidade_saude,
              prof.no_civil_profissional, cbo.no_cbo, ta.no_tipo_atend,
              cid_a.cid10s
       FROM public.tb_atend a
       INNER JOIN public.tb_prontuario pront ON pront.co_seq_prontuario = a.co_prontuario
       INNER JOIN public.tb_atend_prof ap ON ap.co_atend = a.co_seq_atend
       LEFT JOIN public.tb_lotacao l ON l.co_ator_papel = ap.co_lotacao
       LEFT JOIN public.tb_prof prof ON prof.co_seq_prof = l.co_prof
       LEFT JOIN public.tb_cbo cbo ON cbo.co_cbo = l.co_cbo
       LEFT JOIN public.tb_tipo_atend ta ON ap.tp_atend_prof = ta.co_tipo_atend
       LEFT JOIN LATERAL (
         SELECT array_agg(DISTINCT cid.no_cid10::text) AS cid10s
         FROM public.rl_evolucao_avaliacao_ciap_cid r
         INNER JOIN public.tb_cid10 cid ON cid.co_cid10 = r.co_cid10
         WHERE r.co_atend_prof = ap.co_seq_atend_prof
       ) cid_a ON true
       WHERE pront.co_cidadao = $1
       ORDER BY ap.dt_inicio DESC NULLS LAST
       LIMIT 200`,
      [patientId],
    );
  }

  async findDocumentsByPatient(_patientId: string): Promise<Document[]> {
    // TODO(db-mapping): mapear documentos/prescrições no e-SUS PEC
    return [];
  }

  /**
   * `public.tb_unidade_saude` já é usada (confirmada) nas queries de
   * atendimento — `co_seq_unidade_saude`/`no_unidade_saude` são reais.
   * Endereço, telefone e especialidades NÃO confirmados: a documentação
   * técnica oficial do e-SUS (integracao.esusaps.bridge.ufsc.tech,
   * sisaps.saude.gov.br) está bloqueada pela rede deste ambiente — não
   * consegui verificar essas colunas. `type` é inferido do nome da unidade
   * (heurística por palavra-chave — ver classifyHealthUnitType), já que não
   * há coluna de tipo confirmada.
   */
  async findHealthUnits(): Promise<HealthUnit[]> {
    const rows = await this.pool.query<{ co_seq_unidade_saude: string; no_unidade_saude: string }>(
      `SELECT co_seq_unidade_saude::text AS co_seq_unidade_saude, no_unidade_saude
       FROM public.tb_unidade_saude
       ORDER BY no_unidade_saude`,
    );

    return rows.map((row) => ({
      id: row.co_seq_unidade_saude,
      name: row.no_unidade_saude,
      type: classifyHealthUnitType(row.no_unidade_saude),
      address: null,
      phone: null,
      specialties: [],
      openingHours: null,
      latitude: null,
      longitude: null,
      sourceSystem: "esus-pec" as const,
    }));
  }

  /**
   * Confirmado: `public.tb_calendario_vacinal` liga imunobiológico + dose
   * (`tb_imunobiologico`/`tb_dose_imunobiologico`) com ordem de exibição
   * (`nu_ordem_imunobiologico`/`nu_ordem_dose`), e `tb_regra_vacinal_estrategia`
   * liga essa mesma dupla a uma faixa etária (`tb_faixa_etaria_vacinacao`,
   * que já vem em dias desde o nascimento — `nu_dias_inicio`). Uma dupla
   * imunobiológico+dose pode ter mais de uma regra (estratégias diferentes,
   * ex. rotina vs. campanha) — o DISTINCT ON pega a de menor
   * `nu_dias_inicio` como referência.
   */
  async findVaccinationCalendar(): Promise<VaccinationCalendarSlot[]> {
    const rows = await this.pool.query<{
      immunobiologic_id: string;
      immunobiologic_name: string;
      dose_id: string;
      dose_label: string;
      age_start_days: number | null;
    }>(
      `SELECT immunobiologic_id, immunobiologic_name, dose_id, dose_label, age_start_days
       FROM (
         SELECT DISTINCT ON (cal.co_imunobiologico, cal.co_dose_imunobiologico)
           cal.co_imunobiologico::text AS immunobiologic_id,
           imuno.no_imunobiologico AS immunobiologic_name,
           cal.co_dose_imunobiologico::text AS dose_id,
           dose.no_dose_imunobiologico AS dose_label,
           cal.nu_ordem_imunobiologico,
           cal.nu_ordem_dose,
           fx.nu_dias_inicio AS age_start_days
         FROM public.tb_calendario_vacinal cal
         INNER JOIN public.tb_imunobiologico imuno ON imuno.co_imunobiologico = cal.co_imunobiologico
         INNER JOIN public.tb_dose_imunobiologico dose ON dose.co_dose_imunobiologico = cal.co_dose_imunobiologico
         LEFT JOIN public.tb_regra_vacinal_estrategia regra
           ON regra.co_imunobiologico = cal.co_imunobiologico AND regra.co_dose_imunobiologico = cal.co_dose_imunobiologico
         LEFT JOIN public.tb_faixa_etaria_vacinacao fx ON fx.co_faixa_etaria_vacinacao = regra.co_faixa_etaria_vacinacao
         WHERE imuno.st_ativo = 1
         ORDER BY cal.co_imunobiologico, cal.co_dose_imunobiologico, fx.nu_dias_inicio ASC NULLS LAST
       ) ranked
       ORDER BY nu_ordem_imunobiologico, nu_ordem_dose`,
    );

    return rows.map((row) => ({
      immunobiologicId: row.immunobiologic_id,
      immunobiologicName: row.immunobiologic_name,
      doseId: row.dose_id,
      doseLabel: row.dose_label,
      ageStartDays: row.age_start_days,
    }));
  }

  /**
   * Confirmado: `public.tb_registro_vacinacao` (uma linha por dose
   * aplicada, com `co_imunobiologico`/`co_dose_imunobiologico` — os mesmos
   * códigos do calendário) liga a `tb_vacinacao` (a visita de vacinação,
   * com `co_prontuario` e `co_atend_prof` diretos). Unidade/profissional
   * seguem o mesmo caminho já confirmado em findAttendanceRows
   * (`tb_atend_prof` → `tb_atend`/`tb_lotacao`/`tb_prof`).
   */
  async findAdministeredVaccines(patientId: string): Promise<AdministeredVaccine[]> {
    const rows = await this.pool.query<{
      immunobiologic_id: string | null;
      immunobiologic_name: string | null;
      dose_id: string | null;
      dose_label: string | null;
      administered_at: string;
      health_unit_name: string | null;
      professional_name: string | null;
    }>(
      `SELECT reg.co_imunobiologico::text AS immunobiologic_id, imuno.no_imunobiologico AS immunobiologic_name,
              reg.co_dose_imunobiologico::text AS dose_id, dose.no_dose_imunobiologico AS dose_label,
              reg.dt_aplicacao AS administered_at,
              us.no_unidade_saude AS health_unit_name, prof.no_civil_profissional AS professional_name
       FROM public.tb_registro_vacinacao reg
       INNER JOIN public.tb_vacinacao v ON v.co_seq_vacinacao = reg.co_vacinacao
       INNER JOIN public.tb_prontuario pront ON pront.co_seq_prontuario = v.co_prontuario
       LEFT JOIN public.tb_imunobiologico imuno ON imuno.co_imunobiologico = reg.co_imunobiologico
       LEFT JOIN public.tb_dose_imunobiologico dose ON dose.co_dose_imunobiologico = reg.co_dose_imunobiologico
       LEFT JOIN public.tb_atend_prof ap ON ap.co_seq_atend_prof = v.co_atend_prof
       LEFT JOIN public.tb_atend a ON a.co_seq_atend = ap.co_atend
       LEFT JOIN public.tb_unidade_saude us ON us.co_seq_unidade_saude = a.co_unidade_saude
       LEFT JOIN public.tb_lotacao l ON l.co_ator_papel = ap.co_lotacao
       LEFT JOIN public.tb_prof prof ON prof.co_seq_prof = l.co_prof
       WHERE pront.co_cidadao = $1 AND reg.dt_aplicacao IS NOT NULL
       ORDER BY reg.dt_aplicacao ASC
       LIMIT 500`,
      [patientId],
    );

    return rows.map((row) => ({
      immunobiologicId: row.immunobiologic_id,
      immunobiologicName: row.immunobiologic_name ?? "Imunobiológico não identificado",
      doseId: row.dose_id,
      doseLabel: row.dose_label,
      administeredAt: row.administered_at,
      healthUnitName: row.health_unit_name,
      professionalName: row.professional_name,
    }));
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
