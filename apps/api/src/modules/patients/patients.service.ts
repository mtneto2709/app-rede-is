import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  Alert,
  DashboardStats,
  HealthSummary,
  PatientProfileSummary,
  VaccinationCardResponse,
} from "@rede-is/shared-types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import { SistemaIsRepository } from "../integrations/sistema-is/sistema-is.repository";
import {
  EsusPecRepository,
  type AdministeredVaccine,
  type VaccinationCalendarSlot,
} from "../integrations/esus-pec/esus-pec.repository";
import { TablesRepository } from "../integrations/tables/tables.repository";
import { VaccinationService } from "./vaccination.service";
import type { PatientSourceRepository } from "../../common/database/patient-source-repository.interface";

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sistemaIs: SistemaIsRepository,
    private readonly esusPec: EsusPecRepository,
    private readonly tables: TablesRepository,
    private readonly vaccination: VaccinationService,
  ) {}

  private repositoryFor(sourceSystem: string): PatientSourceRepository {
    return sourceSystem === "sistema-is" ? this.sistemaIs : this.esusPec;
  }

  /** Resolve o vínculo paciente ⇄ usuário estabelecido no primeiro acesso. */
  private async requireLink(userId: string) {
    const link = await this.prisma.patientLink.findUnique({ where: { userId } });
    if (!link) {
      throw new NotFoundException("Usuário ainda não possui vínculo de paciente. Refaça o primeiro acesso.");
    }
    return link;
  }

  private async logRead(tenantId: string, userId: string, action: string, ip?: string) {
    await this.audit.record({ tenantId, userId, action, ipAddress: ip, resource: `patient-link:${userId}` });
  }

  async getDashboard(tenantId: string, userId: string, ip?: string): Promise<DashboardStats> {
    const link = await this.requireLink(userId);
    const repo = this.repositoryFor(link.sourceSystem);

    const [appointments, attendances, documents, profile, cns] = await Promise.all([
      repo.findAppointmentsByPatient(link.sourcePatientId),
      repo.findAttendancesByPatient(link.sourcePatientId),
      repo.findDocumentsByPatient(link.sourcePatientId),
      repo.getIdentityProfile(link.sourcePatientId),
      repo.getPatientCns(link.sourcePatientId),
    ]);
    const tableAlerts = await this.tables.findAlertsByPatient(profile?.cpf ?? null, cns);

    await this.logRead(tenantId, userId, "patients.dashboard.read", ip);

    return {
      appointmentsCount: appointments.filter((a) => a.status === "scheduled").length,
      attendancesCount: attendances.length,
      documentsCount: documents.length,
      // Mesmo critério de getAlerts: lembretes de agendamento próximo (só
      // "scheduled" + dentro da janela de getAppointments.isUpcoming) +
      // alertas reais de mensagens.msg_alerta (base "Tables").
      alertsCount: appointments.filter((a) => a.status === "scheduled" && isUpcoming(a.scheduledAt)).length + tableAlerts.length,
    };
  }

  async getAppointments(tenantId: string, userId: string, ip?: string) {
    const link = await this.requireLink(userId);
    const result = await this.repositoryFor(link.sourceSystem).findAppointmentsByPatient(link.sourcePatientId);
    await this.logRead(tenantId, userId, "patients.appointments.read", ip);
    return result;
  }

  async getAttendances(tenantId: string, userId: string, ip?: string) {
    const link = await this.requireLink(userId);
    const result = await this.repositoryFor(link.sourceSystem).findAttendancesByPatient(link.sourcePatientId);
    await this.logRead(tenantId, userId, "patients.attendances.read", ip);
    return result;
  }

  async getDocuments(tenantId: string, userId: string, ip?: string) {
    const link = await this.requireLink(userId);
    const result = await this.repositoryFor(link.sourceSystem).findDocumentsByPatient(link.sourcePatientId);
    await this.logRead(tenantId, userId, "patients.documents.read", ip);
    return result;
  }

  /**
   * Alertas combinam dois tipos de fonte: lembretes sintéticos de agendamentos
   * próximos (não persistidos, como já era) + alertas reais de
   * `mensagens.msg_alerta` (base "Tables", fixa pra todos os clientes),
   * buscados por CPF ou, na falta dele, por CNS — nunca os dois junto, como
   * pedido. O CPF/CNS vêm do cadastro de origem (Sistema IS ou e-SUS PEC,
   * dependendo de onde o vínculo do usuário aponta), igual a
   * `getProfileSummary`.
   */
  async getAlerts(tenantId: string, userId: string, ip?: string): Promise<Alert[]> {
    const link = await this.requireLink(userId);
    const repo = this.repositoryFor(link.sourceSystem);

    const [appointments, profile, cns] = await Promise.all([
      this.getAppointments(tenantId, userId, ip),
      repo.getIdentityProfile(link.sourcePatientId),
      repo.getPatientCns(link.sourcePatientId),
    ]);

    const appointmentAlerts: Alert[] = appointments
      .filter((a) => a.status === "scheduled" && isUpcoming(a.scheduledAt))
      .map((a) => ({
        id: `appointment-reminder:${a.id}`,
        patientId: a.patientId,
        title: "Consulta agendada",
        message: `Lembrete: você tem ${a.type === "exam" ? "um exame" : "uma consulta"} em ${new Date(a.scheduledAt).toLocaleString("pt-BR")}`,
        type: "appointment" as const,
        priority: "medium" as const,
        isRead: false,
        createdAt: new Date().toISOString(),
      }));

    const tableAlerts = await this.tables.findAlertsByPatient(profile?.cpf ?? null, cns);
    const messageAlerts: Alert[] = tableAlerts.map((alert) => ({
      ...alert,
      patientId: link.sourcePatientId,
      priority: "medium" as const,
      isRead: false,
    }));

    await this.logRead(tenantId, userId, "patients.alerts.read", ip);
    return [...messageAlerts, ...appointmentAlerts];
  }

  async getHealthUnits(tenantId: string, userId: string, ip?: string) {
    const link = await this.requireLink(userId);
    const result = await this.repositoryFor(link.sourceSystem).findHealthUnits();
    await this.logRead(tenantId, userId, "patients.health_units.read", ip);
    return result;
  }

  /**
   * Vacinação hoje só é mapeada no e-SUS PEC (`available: false` para
   * quem foi vinculado pelo Sistema IS). Calendário e doses administradas
   * são buscados em paralelo e cada um falha de forma isolada — se um dos
   * dois der erro, o outro ainda entra no cálculo (VaccinationService lida
   * com calendário vazio caindo pro PNI fixo, e com lista de administradas
   * vazia mostrando tudo como "atrasada"/"futura") em vez de quebrar a
   * tela inteira.
   */
  /**
   * Vacinação vive só no e-SUS PEC, mesmo quando o vínculo da conta é com o
   * Sistema IS — é o mesmo cidadão nas duas bases, só que o primeiro acesso
   * pode ter resolvido pro Sistema IS (ex.: contato não encontrado no
   * e-SUS naquela busca). Por isso, quando o vínculo não é direto com o
   * e-SUS, busca o cadastro de lá por CPF antes de desistir.
   */
  private async resolveEsusCitizenId(link: { sourceSystem: string; sourcePatientId: string }): Promise<string | null> {
    if (link.sourceSystem === "esus-pec") return link.sourcePatientId;

    const profile = await this.repositoryFor(link.sourceSystem).getIdentityProfile(link.sourcePatientId);
    if (!profile?.cpf) return null;

    return this.esusPec.findCitizenIdByCpf(profile.cpf).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao cruzar CPF com o e-SUS PEC (vacinação): ${message}`);
      return null;
    });
  }

  async getVaccinationCard(tenantId: string, userId: string, ip?: string): Promise<VaccinationCardResponse> {
    const link = await this.requireLink(userId);
    const esusCitizenId = await this.resolveEsusCitizenId(link);
    if (!esusCitizenId) {
      return { available: false, entries: [] };
    }

    const [profile, calendar, administered] = await Promise.all([
      this.esusPec.getIdentityProfile(esusCitizenId),
      this.esusPec.findVaccinationCalendar().catch((err): VaccinationCalendarSlot[] => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Falha ao buscar calendário vacinal: ${message}`);
        return [];
      }),
      this.esusPec.findAdministeredVaccines(esusCitizenId).catch((err): AdministeredVaccine[] => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Falha ao buscar vacinas administradas (${esusCitizenId}): ${message}`);
        return [];
      }),
    ]);

    const entries = this.vaccination.buildCard(profile?.birthDate ?? null, calendar, administered);
    await this.logRead(tenantId, userId, "patients.vaccination_card.read", ip);
    return { available: true, entries };
  }

  /** Nome + CNS pra sobrepor nos moldes de cartão do tenant (tela Meus Cartões). */
  async getProfileSummary(tenantId: string, userId: string, ip?: string): Promise<PatientProfileSummary> {
    const link = await this.requireLink(userId);
    const repo = this.repositoryFor(link.sourceSystem);
    const [profile, cns] = await Promise.all([
      repo.getIdentityProfile(link.sourcePatientId),
      repo.getPatientCns(link.sourcePatientId),
    ]);
    await this.logRead(tenantId, userId, "patients.profile.read", ip);
    return {
      name: profile?.name ?? "",
      cns,
      cpf: profile?.cpf ?? null,
      birthDate: profile?.birthDate ?? null,
      phone: profile?.mobilePhones[0] ?? null,
      email: profile?.emails[0] ?? null,
    };
  }

  async getHealthSummary(tenantId: string, userId: string, ip?: string): Promise<HealthSummary> {
    const link = await this.requireLink(userId);
    const result = await this.repositoryFor(link.sourceSystem).getHealthSummary(link.sourcePatientId);
    await this.logRead(tenantId, userId, "patients.health_summary.read", ip);
    return result;
  }
}

function isUpcoming(isoDate: string, withinDays = 7): boolean {
  const date = new Date(isoDate).getTime();
  const now = Date.now();
  return date > now && date - now < withinDays * 24 * 60 * 60 * 1000;
}
