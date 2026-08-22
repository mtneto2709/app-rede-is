import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { DashboardStats, VaccinationCardResponse } from "@rede-is/shared-types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import { SistemaIsRepository } from "../integrations/sistema-is/sistema-is.repository";
import { EsusPecRepository, type AdministeredVaccine } from "../integrations/esus-pec/esus-pec.repository";
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

    const [appointments, attendances, documents] = await Promise.all([
      repo.findAppointmentsByPatient(link.sourcePatientId),
      repo.findAttendancesByPatient(link.sourcePatientId),
      repo.findDocumentsByPatient(link.sourcePatientId),
    ]);

    await this.logRead(tenantId, userId, "patients.dashboard.read", ip);

    return {
      appointmentsCount: appointments.filter((a) => a.status === "scheduled").length,
      attendancesCount: attendances.length,
      documentsCount: documents.length,
      // TODO(db-mapping): alertas hoje são derivados de agendamentos
      // próximos; avaliar se o Sistema IS/e-SUS PEC expõe alertas nativos.
      alertsCount: appointments.filter((a) => isUpcoming(a.scheduledAt)).length,
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

  /** Alertas simples derivados de agendamentos próximos (não persistidos). */
  async getAlerts(tenantId: string, userId: string, ip?: string) {
    const appointments = await this.getAppointments(tenantId, userId, ip);
    return appointments
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
  }

  async getHealthUnits(tenantId: string, userId: string, ip?: string) {
    const link = await this.requireLink(userId);
    const result = await this.repositoryFor(link.sourceSystem).findHealthUnits();
    await this.logRead(tenantId, userId, "patients.health_units.read", ip);
    return result;
  }

  /**
   * Vacinação hoje só é mapeada no e-SUS PEC (`available: false` para
   * quem foi vinculado pelo Sistema IS). Se a busca de doses administradas
   * falhar (tabela ainda não confirmada — ver EsusPecRepository), degrada
   * para devolver só o calendário (tudo como "atrasada"/"futura") em vez de
   * quebrar a tela inteira — melhor mostrar o calendário sem histórico do
   * que não mostrar nada.
   */
  async getVaccinationCard(tenantId: string, userId: string, ip?: string): Promise<VaccinationCardResponse> {
    const link = await this.requireLink(userId);
    if (link.sourceSystem !== "esus-pec") {
      return { available: false, entries: [] };
    }

    const profile = await this.esusPec.getIdentityProfile(link.sourcePatientId);

    let administered: AdministeredVaccine[] = [];
    try {
      administered = await this.esusPec.findAdministeredVaccines(link.sourcePatientId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao buscar vacinas administradas (${link.sourcePatientId}): ${message}`);
    }

    const entries = this.vaccination.buildCard(profile?.birthDate ?? null, administered);
    await this.logRead(tenantId, userId, "patients.vaccination_card.read", ip);
    return { available: true, entries };
  }
}

function isUpcoming(isoDate: string, withinDays = 7): boolean {
  const date = new Date(isoDate).getTime();
  const now = Date.now();
  return date > now && date - now < withinDays * 24 * 60 * 60 * 1000;
}
