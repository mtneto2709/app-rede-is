import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { getEsusPecConnectionConfig, type Env } from "@rede-is/config";
import type {
  AllergyEntry,
  Appointment,
  Attendance,
  ContinuousMedication,
  Document,
  HealthCondition,
  HealthUnit,
  Patient,
  VitalMeasurements,
} from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import {
  classifyAppointmentStatus,
  classifyAppointmentType,
  classifyAttendanceCategory,
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
   * da unidade, mesma tabela já confirmada em `findHealthUnits`). Tipo de
   * atendimento profissional (`tp_atend_prof` → `tb_tipo_atend_prof`,
   * relação confirmada pelo cliente) e CIAP2 vêm de `findAttendanceRows`
   * (isolados — ver comentário lá). `prescription` fica null — não há, na
   * referência disponível, uma tabela de prescrição mapeada.
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
      typeLabel: row.no_tipo_atend_prof,
      category: classifyAttendanceCategory(row.no_tipo_atend_prof),
      type: classifyAttendanceType(row.no_tipo_atend_prof),
      sourceSystem: "esus-pec" as const,
    }));
  }

  /**
   * Três tentativas em cascata, da mais completa pra mais segura — cada
   * uma isolada por try/catch, nunca deixando a tela de Atendimentos
   * quebrar por causa de uma coluna não confirmada:
   *  1. tipo de atendimento profissional (`tb_tipo_atend_prof`) + CIAP2 (`tb_ciap`)
   *  2. só tipo de atendimento profissional (sem CIAP2)
   *  3. nem um nem outro (o que já era confirmado antes desta mudança)
   * `tb_atend_prof.tp_atend_prof` → `tb_tipo_atend_prof` é a relação que o
   * cliente confirmou; `co_tipo_atend_prof`/`no_tipo_atend_prof` seguem o
   * padrão de nome já confirmado repetidas vezes nesta base
   * (`co_seq_<tabela>`/`no_<tabela>`), mas nunca vi o nome exato dessas
   * colunas específicas. `tb_ciap`/`co_ciap` continuam sendo o palpite de
   * menor confiança (só a tabela de relação é confirmada, não a coluna).
   */
  private async findAttendanceRows(patientId: string): Promise<
    {
      co_seq_atend_prof: string;
      dt_inicio: string;
      co_unidade_saude: string | null;
      no_unidade_saude: string | null;
      no_civil_profissional: string | null;
      no_cbo: string | null;
      no_tipo_atend_prof: string | null;
      cid10s: string[] | null;
      ciap2s: string[] | null;
    }[]
  > {
    const baseSelect = `SELECT ap.co_seq_atend_prof::text AS co_seq_atend_prof, ap.dt_inicio,
              a.co_unidade_saude::text AS co_unidade_saude, us.no_unidade_saude,
              prof.no_civil_profissional, cbo.no_cbo,
              cid_a.cid10s`;
    const baseFrom = `FROM public.tb_atend a
       INNER JOIN public.tb_prontuario pront ON pront.co_seq_prontuario = a.co_prontuario
       INNER JOIN public.tb_atend_prof ap ON ap.co_atend = a.co_seq_atend
       LEFT JOIN public.tb_lotacao l ON l.co_ator_papel = ap.co_lotacao
       LEFT JOIN public.tb_prof prof ON prof.co_seq_prof = l.co_prof
       LEFT JOIN public.tb_cbo cbo ON cbo.co_cbo = l.co_cbo
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
    const tipoJoin = `LEFT JOIN public.tb_tipo_atend_prof ta ON ta.co_tipo_atend_prof = ap.tp_atend_prof`;
    const ciapJoin = `LEFT JOIN LATERAL (
         SELECT array_agg(DISTINCT ciap.no_ciap::text) AS ciap2s
         FROM public.rl_evolucao_avaliacao_ciap_cid r
         INNER JOIN public.tb_ciap ciap ON ciap.co_ciap = r.co_ciap
         WHERE r.co_atend_prof = ap.co_seq_atend_prof
       ) ciap_a ON true`;

    try {
      return await this.pool.query(
        `${baseSelect}, ta.no_tipo_atend_prof, ciap_a.ciap2s ${baseFrom} ${tipoJoin} ${ciapJoin} ${tail}`,
        [patientId],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar tipo+CIAP2 juntos — tentando só o tipo de atendimento: ${message}`);
    }

    try {
      const rows = await this.pool.query<{
        co_seq_atend_prof: string;
        dt_inicio: string;
        co_unidade_saude: string | null;
        no_unidade_saude: string | null;
        no_civil_profissional: string | null;
        no_cbo: string | null;
        no_tipo_atend_prof: string | null;
        cid10s: string[] | null;
      }>(`${baseSelect}, ta.no_tipo_atend_prof ${baseFrom} ${tipoJoin} ${tail}`, [patientId]);
      return rows.map((row) => ({ ...row, ciap2s: null }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Falha ao buscar tipo de atendimento profissional (tb_tipo_atend_prof, coluna não confirmada) — seguindo sem tipo nem CIAP2: ${message}`,
      );
    }

    const rows = await this.pool.query<{
      co_seq_atend_prof: string;
      dt_inicio: string;
      co_unidade_saude: string | null;
      no_unidade_saude: string | null;
      no_civil_profissional: string | null;
      no_cbo: string | null;
      cid10s: string[] | null;
    }>(`${baseSelect} ${baseFrom} ${tail}`, [patientId]);
    return rows.map((row) => ({ ...row, no_tipo_atend_prof: null, ciap2s: null }));
  }

  /**
   * O e-SUS PEC não guarda um PDF pronto por documento — a tela
   * "Visualizar atestado" do sistema monta o texto na hora a partir de
   * dados estruturados (unidade, profissional, CID10, dias de
   * afastamento). Por isso `Document.content` carrega esses campos, não
   * `fileUrl` — o app monta a própria visualização equivalente.
   *
   * Três fontes independentes, cada uma isolada com try/catch, mescladas e
   * ordenadas por data (mais recente primeiro):
   *  - Atestados: CONFIRMADO via DDL — `tb_atestado`.
   *  - Receitas: CONFIRMADO via DDL — `tb_receita_medicamento` (não mais
   *    o palpite antigo `tb_prescricao_medicamento`, que não existe),
   *    agrupada por atendimento — um "documento" por atendimento que
   *    gerou pelo menos uma prescrição.
   *  - Encaminhamentos: `tb_encaminhamento_externo` — ainda sem DDL
   *    confirmado (nenhum client forneceu essa tabela até agora); nome de
   *    tabela com alguma base conceitual (`EncaminhamentoExternoThrift`
   *    existe no formato oficial CDS/RAS), mas o nome Postgres em si
   *    continua sendo chute.
   */
  async findDocumentsByPatient(patientId: string): Promise<Document[]> {
    const [certificates, prescriptions, referrals] = await Promise.all([
      this.findCertificateDocuments(patientId),
      this.findPrescriptionDocuments(patientId),
      this.findReferralDocuments(patientId),
    ]);

    return [...certificates, ...prescriptions, ...referrals].sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
    );
  }

  private readonly atendProfContextJoin = `
       INNER JOIN public.tb_atend_prof ap ON ap.co_seq_atend_prof = {{FK}}
       INNER JOIN public.tb_atend a ON a.co_seq_atend = ap.co_atend
       INNER JOIN public.tb_prontuario p ON p.co_seq_prontuario = a.co_prontuario
       LEFT JOIN public.tb_lotacao l ON l.co_ator_papel = ap.co_lotacao
       LEFT JOIN public.tb_prof prof ON prof.co_seq_prof = l.co_prof
       LEFT JOIN public.tb_cbo cbo ON cbo.co_cbo = l.co_cbo
       LEFT JOIN public.tb_unidade_saude us ON us.co_seq_unidade_saude = a.co_unidade_saude`;

  /**
   * CONFIRMADO via DDL: `tb_atestado`. `co_atend_prof` e `co_prontuario`
   * são ambos opcionais na tabela (nenhum `not null`) — usamos
   * `co_prontuario` (link direto e mais confiável) pra achar o cidadão, e
   * LEFT JOIN em `tb_atend_prof` só pra enriquecer com profissional/unidade
   * quando existir. Coluna de dias é `nu_dias` (não `nu_dias_afastamento`
   * como eu tinha chutado antes), e a data de início do afastamento é
   * `dt_afastamento`, direto na tabela — usada como `issuedAt` quando não
   * há atendimento vinculado.
   */
  private async findCertificateDocuments(patientId: string): Promise<Document[]> {
    try {
      const rows = await this.pool.query<{
        co_seq_atestado: string;
        nu_dias: number | null;
        ds_atestado: string | null;
        dt_afastamento: string | null;
        no_cid10: string | null;
        atend_at: string | null;
        no_civil_profissional: string | null;
        no_cbo: string | null;
        no_unidade_saude: string | null;
      }>(
        `SELECT at.co_seq_atestado::text AS co_seq_atestado, at.nu_dias, at.ds_atestado, at.dt_afastamento, cid.no_cid10,
                ap.dt_inicio AS atend_at, prof.no_civil_profissional, cbo.no_cbo, us.no_unidade_saude
         FROM public.tb_atestado at
         INNER JOIN public.tb_prontuario p ON p.co_seq_prontuario = at.co_prontuario
         LEFT JOIN public.tb_atend_prof ap ON ap.co_seq_atend_prof = at.co_atend_prof
         LEFT JOIN public.tb_atend a ON a.co_seq_atend = ap.co_atend
         LEFT JOIN public.tb_lotacao l ON l.co_ator_papel = ap.co_lotacao
         LEFT JOIN public.tb_prof prof ON prof.co_seq_prof = l.co_prof
         LEFT JOIN public.tb_cbo cbo ON cbo.co_cbo = l.co_cbo
         LEFT JOIN public.tb_unidade_saude us ON us.co_seq_unidade_saude = a.co_unidade_saude
         LEFT JOIN public.tb_cid10 cid ON cid.co_cid10 = at.co_cid10
         WHERE p.co_cidadao = $1`,
        [patientId],
      );

      return rows
        .filter((row) => row.atend_at || row.dt_afastamento)
        .map((row) => ({
          id: `certificate:${row.co_seq_atestado}`,
          patientId,
          title: "Atestado Médico",
          type: "certificate" as const,
          issuedAt: (row.atend_at ?? row.dt_afastamento) as string,
          professionalName: row.no_civil_profissional,
          description: row.nu_dias ? `${row.nu_dias} dia(s) de afastamento` : row.no_cid10,
          fileUrl: null,
          content: {
            healthUnitName: row.no_unidade_saude,
            professionalName: row.no_civil_profissional,
            professionalRole: row.no_cbo,
            cid10: row.no_cid10,
            daysOff: row.nu_dias,
            text: row.ds_atestado,
          },
          sourceSystem: "esus-pec" as const,
        }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar atestados (tb_atestado) de ${patientId}: ${message}`);
      return [];
    }
  }

  /**
   * CONFIRMADO via DDL: `tb_receita_medicamento` (não a tabela
   * `tb_prescricao_medicamento` chutada antes, que não existe), agrupada
   * por atendimento — um "documento" por atendimento que gerou pelo menos
   * uma prescrição. Nome do medicamento vem do catálogo `tb_medicamento`
   * (tabela e relacionamento `co_medicamento` reais; nome da coluna de
   * rótulo, `no_medicamento`, é chute por convenção).
   */
  private async findPrescriptionDocuments(patientId: string): Promise<Document[]> {
    try {
      const rows = await this.pool.query<{
        co_seq_atend_prof: string;
        itens: string[];
        dt_inicio: string;
        no_civil_profissional: string | null;
        no_cbo: string | null;
        no_unidade_saude: string | null;
      }>(
        `SELECT ap.co_seq_atend_prof::text, array_agg(DISTINCT (med.no_medicamento || coalesce(' — ' || r.no_posologia, ''))) AS itens,
                ap.dt_inicio, prof.no_civil_profissional, cbo.no_cbo, us.no_unidade_saude
         FROM public.tb_receita_medicamento r
         ${this.atendProfContextJoin.replace("{{FK}}", "r.co_atend_prof")}
         LEFT JOIN public.tb_medicamento med ON med.co_medicamento = r.co_medicamento
         WHERE p.co_cidadao = $1
         GROUP BY ap.co_seq_atend_prof, ap.dt_inicio, prof.no_civil_profissional, cbo.no_cbo, us.no_unidade_saude`,
        [patientId],
      );

      return rows.map((row) => ({
        id: `prescription:${row.co_seq_atend_prof}`,
        patientId,
        title: "Receita Médica",
        type: "prescription" as const,
        issuedAt: row.dt_inicio,
        professionalName: row.no_civil_profissional,
        description: `${row.itens.length} medicamento(s)`,
        fileUrl: null,
        content: {
          healthUnitName: row.no_unidade_saude,
          professionalName: row.no_civil_profissional,
          professionalRole: row.no_cbo,
          cid10: null,
          daysOff: null,
          text: row.itens.join("\n"),
        },
        sourceSystem: "esus-pec" as const,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar receitas (tb_receita_medicamento) de ${patientId}: ${message}`);
      return [];
    }
  }

  private async findReferralDocuments(patientId: string): Promise<Document[]> {
    try {
      const rows = await this.pool.query<{
        co_seq_encaminhamento: string;
        ds_especialidade: string | null;
        no_cid10: string | null;
        dt_inicio: string;
        no_civil_profissional: string | null;
        no_cbo: string | null;
        no_unidade_saude: string | null;
      }>(
        `SELECT enc.co_seq_encaminhamento::text AS co_seq_encaminhamento, enc.ds_especialidade, cid.no_cid10,
                ap.dt_inicio, prof.no_civil_profissional, cbo.no_cbo, us.no_unidade_saude
         FROM public.tb_encaminhamento_externo enc
         ${this.atendProfContextJoin.replace("{{FK}}", "enc.co_atend_prof")}
         LEFT JOIN public.tb_cid10 cid ON cid.co_cid10 = enc.co_cid10
         WHERE p.co_cidadao = $1`,
        [patientId],
      );

      return rows.map((row) => ({
        id: `referral:${row.co_seq_encaminhamento}`,
        patientId,
        title: row.ds_especialidade ? `Encaminhamento — ${row.ds_especialidade}` : "Encaminhamento",
        type: "referral" as const,
        issuedAt: row.dt_inicio,
        professionalName: row.no_civil_profissional,
        description: row.no_cid10,
        fileUrl: null,
        content: {
          healthUnitName: row.no_unidade_saude,
          professionalName: row.no_civil_profissional,
          professionalRole: row.no_cbo,
          cid10: row.no_cid10,
          daysOff: null,
          text: row.ds_especialidade,
        },
        sourceSystem: "esus-pec" as const,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar encaminhamentos (tb_encaminhamento_externo, tabela não confirmada) de ${patientId}: ${message}`);
      return [];
    }
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
   * Confiança por fonte, depois do DDL real que o cliente passou pras
   * tabelas de medição/alergia/atestado/uso contínuo/problema:
   *  - conditions (auto-relatadas): ainda `tb_cds_cad_individual`, schema
   *    repassado pelo cliente antes desta rodada — inalterado.
   *  - conditions (diagnosticadas): CONFIRMADO via DDL — `tb_problema` +
   *    `tb_problema_evolucao` (não mais o palpite antigo
   *    `tb_antecedente`/`tb_problema_condicao`, que não existe). Ver
   *    `getDiagnosedConditions`.
   *  - measurements: CONFIRMADO via DDL — `tb_medicao`, mas os valores são
   *    `varchar`, não numérico, e pressão arterial vem num campo único
   *    (`nu_medicao_pressao_arterial`, ex. "120x80") em vez de dois campos
   *    separados. Parseado em `parseMeasurementNumber`/`parseBloodPressure`.
   *  - medications (uso contínuo): CONFIRMADO via DDL — `tb_medicamento_uso_continuo`
   *    (a tabela dedicada de "em uso", não mais um filtro por flag numa
   *    tabela de prescrição avulsa). Nome do medicamento via catálogo
   *    `tb_medicamento` (nome da coluna, `no_medicamento`, é chute por
   *    convenção — a tabela e o relacionamento são reais).
   *  - allergies: CONFIRMADO via DDL — `tb_alergia` (ligada por
   *    `co_prontuario`, não por `co_cidadao` direto). Nome da substância:
   *    tenta enriquecer com o catálogo `tb_substancia_espec_alergia` (nome
   *    de tabela real, nome de coluna chutado por convenção), com fallback
   *    pro campo legado `no_substancia_especifica` (esse sim, 100%
   *    confirmado na própria `tb_alergia`) se o catálogo não bater.
   */
  async getHealthSummary(sourcePatientId: string): Promise<HealthSummaryResult> {
    const [selfReported, diagnosed, measurements, medications, allergies] = await Promise.all([
      this.getSelfReportedConditions(sourcePatientId),
      this.getDiagnosedConditions(sourcePatientId),
      this.getVitalMeasurements(sourcePatientId),
      this.getMedicationsInUse(sourcePatientId),
      this.getAllergies(sourcePatientId),
    ]);

    if (
      selfReported === null &&
      diagnosed === null &&
      measurements === null &&
      medications === null &&
      allergies === null
    ) {
      return { available: false, conditions: [], medications: [], exams: [], allergies: [], measurements: null };
    }

    const seen = new Set<string>();
    const conditions = [...(selfReported ?? []), ...(diagnosed ?? [])].filter((c) => {
      const key = c.label.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      available: true,
      conditions,
      medications: medications ?? [],
      exams: [],
      allergies: allergies ?? [],
      measurements: measurements ?? null,
    };
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
        .map(([, label]) => ({ id: `self-reported:${label}`, label, startedAt: null }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar condições auto-relatadas (tb_cds_cad_individual) de ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  /**
   * Problemas/condições diagnosticados — CONFIRMADO via DDL do cliente:
   * `tb_problema` (o problema em si, ligado direto a `tb_prontuario`,
   * codificado em CID-10 ou CIAP2, ou texto livre em `ds_outro` quando
   * nenhum dos dois se aplica) + `tb_problema_evolucao` (a evolução mais
   * recente, via `co_ultimo_problema_evolucao`, de onde vem a data real de
   * início — `dt_inicio_problema`, confirmada). `no_ciap` segue o mesmo
   * chute de nome de coluna já usado em `findAttendanceRows` (a tabela e o
   * relacionamento são reais, o nome da coluna de rótulo é convenção).
   */
  private async getDiagnosedConditions(sourcePatientId: string): Promise<HealthCondition[] | null> {
    try {
      const rows = await this.pool.query<{
        co_seq_problema: string;
        no_cid10: string | null;
        no_ciap: string | null;
        ds_outro: string | null;
        dt_inicio_problema: string | null;
      }>(
        `SELECT DISTINCT pr.co_seq_problema::text AS co_seq_problema, cid.no_cid10, ciap.no_ciap, pr.ds_outro,
                ev.dt_inicio_problema
         FROM public.tb_problema pr
         INNER JOIN public.tb_prontuario p ON p.co_seq_prontuario = pr.co_prontuario
         LEFT JOIN public.tb_cid10 cid ON cid.co_cid10 = pr.co_cid10
         LEFT JOIN public.tb_ciap ciap ON ciap.co_ciap = pr.co_ciap
         LEFT JOIN public.tb_problema_evolucao ev ON ev.co_seq_problema_evolucao = pr.co_ultimo_problema_evolucao
         WHERE p.co_cidadao = $1`,
        [sourcePatientId],
      );

      return rows
        .map((row) => ({ ...row, label: row.no_cid10 ?? row.no_ciap ?? row.ds_outro }))
        .filter((row): row is typeof row & { label: string } => !!row.label)
        .map((row) => ({ id: `diagnosed:${row.co_seq_problema}`, label: row.label, startedAt: row.dt_inicio_problema }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar condições diagnosticadas (tb_problema/tb_problema_evolucao) de ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  /**
   * Converte um valor de medição do e-SUS pra número — os campos de
   * `tb_medicao` são todos `varchar` (não numérico), e a instalação
   * brasileira normalmente usa vírgula como separador decimal.
   */
  private parseMeasurementNumber(raw: string | null | undefined): number | null {
    if (!raw) return null;
    const value = Number(raw.trim().replace(",", "."));
    return Number.isFinite(value) ? value : null;
  }

  /**
   * `tb_medicao.nu_medicao_pressao_arterial` guarda sistólica e diastólica
   * juntas num único campo de texto (ex. "120x80" ou "120/80") em vez de
   * duas colunas — separa nos dois números que `VitalMeasurements` espera.
   */
  private parseBloodPressure(raw: string | null): { systolic: number | null; diastolic: number | null } {
    const match = raw?.trim().match(/(\d+[.,]?\d*)\s*[xX/]\s*(\d+[.,]?\d*)/);
    if (!match) return { systolic: null, diastolic: null };
    return {
      systolic: this.parseMeasurementNumber(match[1]),
      diastolic: this.parseMeasurementNumber(match[2]),
    };
  }

  /**
   * CONFIRMADO via DDL: `tb_medicao`, ligada por `co_atend_prof` (mesmo
   * caminho até `tb_prontuario` usado no resto da base). Data real da
   * medição é `dt_medicao` (direto na própria tabela, mais preciso que a
   * data do atendimento). Pega a medição mais recente do cidadão.
   */
  private async getVitalMeasurements(sourcePatientId: string): Promise<VitalMeasurements | null> {
    try {
      const rows = await this.pool.query<{
        dt_medicao: string;
        nu_medicao_peso: string | null;
        nu_medicao_altura: string | null;
        nu_medicao_pressao_arterial: string | null;
        nu_medicao_frequencia_cardiaca: string | null;
        nu_medicao_temperatura: string | null;
        nu_medicao_saturacao_o2: string | null;
        nu_medicao_glicemia: string | null;
      }>(
        `SELECT m.dt_medicao, m.nu_medicao_peso, m.nu_medicao_altura, m.nu_medicao_pressao_arterial,
                m.nu_medicao_frequencia_cardiaca, m.nu_medicao_temperatura, m.nu_medicao_saturacao_o2, m.nu_medicao_glicemia
         FROM public.tb_medicao m
         INNER JOIN public.tb_atend_prof ap ON ap.co_seq_atend_prof = m.co_atend_prof
         INNER JOIN public.tb_atend a ON a.co_seq_atend = ap.co_atend
         INNER JOIN public.tb_prontuario p ON p.co_seq_prontuario = a.co_prontuario
         WHERE p.co_cidadao = $1
         ORDER BY m.dt_medicao DESC NULLS LAST
         LIMIT 1`,
        [sourcePatientId],
      );

      const row = rows[0];
      if (!row) return null;
      const bloodPressure = this.parseBloodPressure(row.nu_medicao_pressao_arterial);
      return {
        measuredAt: row.dt_medicao,
        weightKg: this.parseMeasurementNumber(row.nu_medicao_peso),
        heightCm: this.parseMeasurementNumber(row.nu_medicao_altura),
        bloodPressureSystolic: bloodPressure.systolic,
        bloodPressureDiastolic: bloodPressure.diastolic,
        heartRate: this.parseMeasurementNumber(row.nu_medicao_frequencia_cardiaca),
        temperature: this.parseMeasurementNumber(row.nu_medicao_temperatura),
        oxygenSaturation: this.parseMeasurementNumber(row.nu_medicao_saturacao_o2),
        capillaryGlucose: this.parseMeasurementNumber(row.nu_medicao_glicemia),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar medições (tb_medicao) de ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  /**
   * CONFIRMADO via DDL: `tb_medicamento_uso_continuo` é a tabela dedicada
   * de "medicamentos em uso" do cidadão (uma linha por medicamento,
   * ligada direto a `tb_prontuario` — não precisa passar por atendimento),
   * com `co_ultima_receita_medicamento` apontando pra prescrição mais
   * recente desse ciclo (de onde vem a posologia). Nome do medicamento via
   * catálogo `tb_medicamento` — nome de coluna (`no_medicamento`) é chute
   * por convenção, tabela e relacionamento (`co_medicamento`) são reais.
   */
  private async getMedicationsInUse(sourcePatientId: string): Promise<ContinuousMedication[] | null> {
    try {
      const rows = await this.pool.query<{
        co_seq_medicament_uso_continuo: string;
        no_medicamento: string | null;
        no_posologia: string | null;
        ds_dose: string | null;
      }>(
        `SELECT tuc.co_seq_medicament_uso_continuo::text AS co_seq_medicament_uso_continuo,
                med.no_medicamento, r.no_posologia, r.ds_dose
         FROM public.tb_medicamento_uso_continuo tuc
         INNER JOIN public.tb_prontuario p ON p.co_seq_prontuario = tuc.co_prontuario
         LEFT JOIN public.tb_medicamento med ON med.co_medicamento = tuc.co_medicamento
         LEFT JOIN public.tb_receita_medicamento r ON r.co_seq_receita_medicamento = tuc.co_ultima_receita_medicamento
         WHERE p.co_cidadao = $1`,
        [sourcePatientId],
      );

      return rows
        .filter((row) => row.no_medicamento)
        .map((row) => ({
          id: `medication:${row.co_seq_medicament_uso_continuo}`,
          name: row.no_medicamento as string,
          dosage: row.no_posologia ?? row.ds_dose,
        }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar medicamentos de uso contínuo (tb_medicamento_uso_continuo) de ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  /**
   * CONFIRMADO via DDL: `tb_alergia` ligada por `co_prontuario` (não por
   * `co_cidadao` direto). O nome da substância pode vir de dois lugares —
   * `no_substancia_especifica` é um campo legado direto na própria tabela
   * (mantido só pra registros antigos, mas 100% real), ou, pra registros
   * novos, `co_substancia_especifica` aponta pro catálogo estruturado
   * `tb_substancia_espec_alergia` (tabela real, nome da coluna de rótulo
   * chutado por convenção). O tipo de reação vem da evolução mais recente
   * (`co_ultima_alergia_evolucao` → `tb_alergia_evolucao` →
   * `tb_tipo_reacao_alergia`, mesmo padrão de chute).
   *
   * Duas tentativas em cascata: 1) com os catálogos (mais rico, nomes de
   * coluna chutados); 2) só o campo legado direto em `tb_alergia` (garantido
   * — se isso também vier vazio pra registros novos, é porque a
   * instalação não populou mais o campo legado, não um erro de query).
   */
  private async getAllergies(sourcePatientId: string): Promise<AllergyEntry[] | null> {
    try {
      const rows = await this.pool.query<{
        co_seq_alergia: string;
        substancia: string | null;
        reacao: string | null;
      }>(
        `SELECT al.co_seq_alergia::text AS co_seq_alergia,
                COALESCE(sub.no_substancia_espec_alergia, al.no_substancia_especifica) AS substancia,
                tr.no_tipo_reacao_alergia AS reacao
         FROM public.tb_alergia al
         INNER JOIN public.tb_prontuario p ON p.co_seq_prontuario = al.co_prontuario
         LEFT JOIN public.tb_substancia_espec_alergia sub ON sub.co_substancia_espec_alergia = al.co_substancia_especifica
         LEFT JOIN public.tb_alergia_evolucao ev ON ev.co_seq_alergia_evolucao = al.co_ultima_alergia_evolucao
         LEFT JOIN public.tb_tipo_reacao_alergia tr ON tr.co_tipo_reacao_alergia = ev.co_tipo_reacao_alergia
         WHERE p.co_cidadao = $1`,
        [sourcePatientId],
      );
      return rows
        .filter((row) => row.substancia)
        .map((row) => ({
          id: `allergy:${row.co_seq_alergia}`,
          label: row.reacao ? `${row.substancia} — ${row.reacao}` : (row.substancia as string),
        }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar alergias com catálogo (tb_substancia_espec_alergia/tb_tipo_reacao_alergia, coluna não confirmada) — tentando só o campo legado: ${message}`);
    }

    try {
      const rows = await this.pool.query<{ co_seq_alergia: string; no_substancia_especifica: string | null }>(
        `SELECT al.co_seq_alergia::text AS co_seq_alergia, al.no_substancia_especifica
         FROM public.tb_alergia al
         INNER JOIN public.tb_prontuario p ON p.co_seq_prontuario = al.co_prontuario
         WHERE p.co_cidadao = $1`,
        [sourcePatientId],
      );
      return rows
        .filter((row) => row.no_substancia_especifica)
        .map((row) => ({ id: `allergy:${row.co_seq_alergia}`, label: row.no_substancia_especifica as string }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Falha ao buscar alergias (tb_alergia) de ${sourcePatientId}: ${message}`);
      return null;
    }
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
