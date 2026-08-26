import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { getEsusPecConnectionConfig, type Env } from "@rede-is/config";
import type { Appointment, Attendance, Document, HealthCondition, HealthUnit, Patient } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import {
  classifyAppointmentStatus,
  classifyAppointmentType,
  classifyAttendanceType,
} from "../../../common/utils/attendance-classification";
import { classifyHealthUnitType } from "../../../common/utils/health-unit-classification";
import type {
  HealthSummaryResult,
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
 * tb_vacinacao, tb_registro_vacinacao). `findAppointmentsByPatient`
 * confirmado com uma query real do cliente contra `tb_agendado` (agenda
 * passada e futura, com status via `tb_situacao_agendado`). `findPatientByCpf`,
 * `findDocumentsByPatient` etc. continuam placeholders.
 */
@Injectable()
export class EsusPecRepository implements PatientSourceRepository, OnModuleDestroy {
  private readonly logger = new Logger(EsusPecRepository.name);
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
   * Confirmado: schema repassado pelo cliente com uma query real que já
   * roda em produção — `public.tb_agendado` (a agenda em si, passada e
   * futura) + `tb_situacao_agendado` (status do slot, via `a.st_agendado`)
   * + `tb_prontuario`/`tb_lotacao`/`tb_prof`/`tb_cbo` pro profissional,
   * mesmo caminho já confirmado em `findAttendanceRows`. `id` é uma chave
   * sintética (`co_prontuario` + `hr_inicial_agendado` + `co_lotacao_agendada`)
   * em vez de uma PK real de `tb_agendado` — a query do cliente nunca
   * seleciona a PK dessa tabela, e como esse dado é só leitura (nunca serve
   * de referência pra escrita), não vale o risco de chutar o nome dela.
   * `type` não tem coluna própria aqui (o `no_cbo` do profissional é o
   * sinal mais próximo disponível) — classificado por palavra-chave com
   * fallback pra "consultation", igual o resto da base.
   */
  async findAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    const rows = await this.pool.query<{
      appointment_id: string;
      scheduled_at: string;
      status_label: string | null;
      professional_name: string | null;
      cbo: string | null;
      unidade_id: string | null;
    }>(
      `SELECT
         a.co_prontuario::text || ':' || extract(epoch FROM a.hr_inicial_agendado)::text || ':' || coalesce(a.co_lotacao_agendada::text, '') AS appointment_id,
         a.hr_inicial_agendado AS scheduled_at,
         sa.no_situacao_agendado AS status_label,
         p.no_civil_profissional AS professional_name,
         cbo.no_cbo AS cbo,
         l.co_unidade_saude::text AS unidade_id
       FROM public.tb_agendado a
       INNER JOIN public.tb_prontuario pront ON pront.co_seq_prontuario = a.co_prontuario
       LEFT JOIN public.tb_situacao_agendado sa ON sa.co_situacao_agendado = a.st_agendado
       LEFT JOIN public.tb_lotacao l ON l.co_ator_papel = a.co_lotacao_agendada
       LEFT JOIN public.tb_prof p ON p.co_seq_prof = l.co_prof
       LEFT JOIN public.tb_cbo cbo ON cbo.co_cbo = l.co_cbo
       WHERE pront.co_cidadao = $1
       ORDER BY a.hr_inicial_agendado DESC
       LIMIT 500`,
      [patientId],
    );

    return rows.map((row) => ({
      id: row.appointment_id,
      patientId,
      professionalName: row.professional_name,
      specialty: row.cbo,
      scheduledAt: row.scheduled_at,
      status: classifyAppointmentStatus(row.status_label),
      type: classifyAppointmentType(row.cbo),
      healthUnitId: row.unidade_id,
      sourceSystem: "esus-pec" as const,
    }));
  }

  /**
   * Confirmado contra uma query real em produção (mesma referência de
   * `getIdentityProfile`) — `tb_atend` (encontro) + `tb_atend_prof` (um
   * profissional dentro do encontro; a granularidade usada aqui, igual à
   * query original) + `tb_prontuario` (liga ao `co_cidadao`) + CID via
   * `rl_evolucao_avaliacao_ciap_cid`/`tb_cid10` + `tb_unidade_saude` (nome
   * da unidade, mesma tabela já confirmada em `findHealthUnits`).
   * `prescription` fica null — não há, na referência disponível, uma
   * tabela de prescrição mapeada. CIAP2 vem de `findAttendanceRows`
   * (isolado — ver comentário lá).
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
      ciap2: row.ciap2s && row.ciap2s.length > 0 ? row.ciap2s.join(", ") : null,
      prescription: null,
      healthUnitId: row.co_unidade_saude,
      healthUnitName: row.no_unidade_saude,
      typeLabel: row.no_tipo_atend,
      type: classifyAttendanceType(row.no_tipo_atend),
      sourceSystem: "esus-pec" as const,
    }));
  }

  private async findAttendanceRows(patientId: string): Promise<
    {
      co_seq_atend_prof: string;
      dt_inicio: string;
      co_unidade_saude: string | null;
      no_unidade_saude: string | null;
      no_civil_profissional: string | null;
      no_cbo: string | null;
      no_tipo_atend: string | null;
      cid10s: string[] | null;
      ciap2s: string[] | null;
    }[]
  > {
    const baseSelect = `SELECT ap.co_seq_atend_prof::text AS co_seq_atend_prof, ap.dt_inicio,
              a.co_unidade_saude::text AS co_unidade_saude, us.no_unidade_saude,
              prof.no_civil_profissional, cbo.no_cbo, ta.no_tipo_atend,
              cid_a.cid10s`;
    const baseFrom = `FROM public.tb_atend a
       INNER JOIN public.tb_prontuario pront ON pront.co_seq_prontuario = a.co_prontuario
       INNER JOIN public.tb_atend_prof ap ON ap.co_atend = a.co_seq_atend
       LEFT JOIN public.tb_lotacao l ON l.co_ator_papel = ap.co_lotacao
       LEFT JOIN public.tb_prof prof ON prof.co_seq_prof = l.co_prof
       LEFT JOIN public.tb_cbo cbo ON cbo.co_cbo = l.co_cbo
       LEFT JOIN public.tb_tipo_atend ta ON ap.tp_atend_prof = ta.co_tipo_atend
       LEFT JOIN public.tb_unidade_saude us ON us.co_seq_unidade_saude = a.co_unidade_saude
       LEFT JOIN LATERAL (
         SELECT array_agg(DISTINCT cid.no_cid10::text) AS cid10s
         FROM public.rl_evolucao_avaliacao_ciap_cid r
         INNER JOIN public.tb_cid10 cid ON cid.co_cid10 = r.co_cid10
         WHERE r.co_atend_prof = ap.co_seq_atend_prof
       ) cid_a ON true`;
    const tail = `WHERE pront.co_cidadao = $1
       ORDER BY ap.dt_inicio DESC NULLS LAST
       LIMIT 200`;

    try {
      // ATENÇÃO(coluna não confirmada): `tb_ciap`/`co_ciap` são um palpite
      // — `rl_evolucao_avaliacao_ciap_cid` (nome real, já confirmado pelo
      // uso do CID10 acima) sugere fortemente que carrega os dois códigos
      // na mesma linha, mas nunca vi o nome exato da coluna CIAP2 nem da
      // tabela de domínio. Tenta a versão enriquecida primeiro; se o nome
      // estiver errado, cai pra query original (sem CIAP2) no catch abaixo
      // — nunca quebra a tela de Atendimentos por causa disso.
      return await this.pool.query(
        `${baseSelect}, ciap_a.ciap2s
         ${baseFrom}
         LEFT JOIN LATERAL (
           SELECT array_agg(DISTINCT ciap.no_ciap::text) AS ciap2s
           FROM public.rl_evolucao_avaliacao_ciap_cid r
           INNER JOIN public.tb_ciap ciap ON ciap.co_ciap = r.co_ciap
           WHERE r.co_atend_prof = ap.co_seq_atend_prof
         ) ciap_a ON true
         ${tail}`,
        [patientId],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar CIAP2 (tb_ciap, coluna não confirmada) — seguindo sem CIAP2: ${message}`);
      const rows = await this.pool.query<{
        co_seq_atend_prof: string;
        dt_inicio: string;
        co_unidade_saude: string | null;
        no_unidade_saude: string | null;
        no_civil_profissional: string | null;
        no_cbo: string | null;
        no_tipo_atend: string | null;
        cid10s: string[] | null;
      }>(`${baseSelect} ${baseFrom} ${tail}`, [patientId]);
      return rows.map((row) => ({ ...row, ciap2s: null }));
    }
  }

  /**
   * TODO(db-mapping): mesma situação da agenda futura (ver
   * findAppointmentsByPatient) — não consegui confirmar, pelas fontes
   * disponíveis, uma tabela dedicada a documentos clínicos emitidos
   * (receita, atestado, declaração de comparecimento) no e-SUS PEC.
   * Levantei a hipótese de que declaração de comparecimento e atestado
   * sejam gerados sob demanda a partir do próprio atendimento (dado já
   * disponível em tb_atend/tb_prontuario, sem tabela própria) em vez de
   * arquivados como entidade separada, mas não tenho como confirmar sem
   * acesso à doc técnica ou ao código-fonte do PEC. Preciso que me passem
   * o resultado de um information_schema.columns filtrando tabelas com
   * "receita"/"atestado"/"prescricao"/"documento"/"declaracao" no nome
   * (mesmo padrão usado pra confirmar o schema de vacinação).
   */
  async findDocumentsByPatient(_patientId: string): Promise<Document[]> {
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

  /**
   * ATENÇÃO(coluna não confirmada): `nu_cns` segue o mesmo padrão de
   * `nu_telefone_celular`/`nu_cpf` (já confirmados em `tb_cidadao`), mas não
   * consegui confirmar esse nome específico — rede bloqueada pra doc
   * técnica, sem acesso ao código-fonte do PEC. Por isso fica isolado deste
   * método (fora de `getIdentityProfile`, usado no login/questionário) e com
   * try/catch: se o nome da coluna estiver errado, só o número do cartão
   * some da tela de Cartões, o resto do app continua de pé.
   */
  async getPatientCns(sourcePatientId: string): Promise<string | null> {
    try {
      const rows = await this.pool.query<{ nu_cns: string | null }>(
        `SELECT nu_cns FROM public.tb_cidadao WHERE co_seq_cidadao = $1`,
        [sourcePatientId],
      );
      return rows[0]?.nu_cns ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar CNS (coluna não confirmada) do cidadão ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  /**
   * ATENÇÃO(schema repassado pelo cliente, não verificado contra um banco
   * real): as duas queries abaixo usam nomes de tabela/coluna que o cliente
   * levantou (não um `information_schema.columns` de uma instalação real —
   * ver a diferença de confiança em relação a `findVaccinationCalendar`,
   * que foi confirmado assim). São plausíveis (`tb_cds_cad_individual` é um
   * nome real e conhecido de tabela de staging CDS do e-SUS PEC, e bate com
   * os campos que eu mesmo já tinha confirmado existir conceitualmente via
   * o thrift oficial de exportação — ver comentário antigo removido daqui),
   * mas cada uma roda isolada com try/catch: se um nome estiver errado,
   * aquela fonte simplesmente não contribui nada, sem derrubar a tela
   * inteira. Medicamento de uso contínuo e resultado de exame continuam
   * sem mapeamento (o cliente só passou o schema de comorbidades até agora).
   */
  async getHealthSummary(sourcePatientId: string): Promise<HealthSummaryResult> {
    const [selfReported, diagnosed] = await Promise.all([
      this.getSelfReportedConditions(sourcePatientId),
      this.getDiagnosedConditions(sourcePatientId),
    ]);

    if (selfReported === null && diagnosed === null) {
      return { available: false, conditions: [], medications: [], exams: [] };
    }

    const seen = new Set<string>();
    const conditions = [...(selfReported ?? []), ...(diagnosed ?? [])].filter((c) => {
      const key = c.label.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { available: true, conditions, medications: [], exams: [] };
  }

  /**
   * Condições auto-relatadas no Cadastro Individual (flags booleanas) —
   * schema repassado pelo cliente, ver ATENÇÃO em `getHealthSummary`.
   * Pega o cadastro mais recente do cidadão (pode haver mais de um ao
   * longo do tempo, ex. recadastramento após mudança de endereço).
   */
  private async getSelfReportedConditions(sourcePatientId: string): Promise<HealthCondition[] | null> {
    try {
      const rows = await this.pool.query<{
        st_hipertensao_arterial: boolean | null;
        st_diabetes: boolean | null;
        st_doenca_cardiaca: boolean | null;
        st_problema_rins: boolean | null;
        st_fumante: boolean | null;
        st_uso_alcool: boolean | null;
      }>(
        `SELECT st_hipertensao_arterial, st_diabetes, st_doenca_cardiaca, st_problema_rins, st_fumante, st_uso_alcool
         FROM public.tb_cds_cad_individual
         WHERE co_cidadao = $1
         ORDER BY dt_cadastro DESC NULLS LAST
         LIMIT 1`,
        [sourcePatientId],
      );

      const row = rows[0];
      if (!row) return [];

      const flags: [boolean | null, string][] = [
        [row.st_hipertensao_arterial, "Hipertensão arterial"],
        [row.st_diabetes, "Diabetes"],
        [row.st_doenca_cardiaca, "Doença cardíaca"],
        [row.st_problema_rins, "Problema nos rins"],
        [row.st_fumante, "Fumante"],
        [row.st_uso_alcool, "Uso de álcool"],
      ];
      return flags
        .filter(([value]) => value === true)
        .map(([, label]) => ({ id: `self-reported:${label}`, label }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar condições auto-relatadas (tb_cds_cad_individual) de ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  /**
   * Problemas/condições diagnosticados em atendimento, codificados em
   * CID-10 — schema repassado pelo cliente, ver ATENÇÃO em `getHealthSummary`.
   */
  private async getDiagnosedConditions(sourcePatientId: string): Promise<HealthCondition[] | null> {
    try {
      const rows = await this.pool.query<{ co_seq_problema_condicao: string; no_cid10: string | null }>(
        `SELECT DISTINCT pc.co_seq_problema_condicao::text AS co_seq_problema_condicao, cid.no_cid10
         FROM public.tb_prontuario p
         INNER JOIN public.tb_antecedente ant ON ant.co_prontuario = p.co_seq_prontuario
         INNER JOIN public.tb_problema_condicao pc ON pc.co_seq_problema_condicao = ant.co_problema_condicao
         LEFT JOIN public.tb_cid10 cid ON cid.co_cid10 = pc.co_cid10
         WHERE p.co_cidadao = $1`,
        [sourcePatientId],
      );

      return rows
        .filter((row) => row.no_cid10)
        .map((row) => ({ id: `diagnosed:${row.co_seq_problema_condicao}`, label: row.no_cid10 as string }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar condições diagnosticadas (tb_antecedente/tb_problema_condicao) de ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
