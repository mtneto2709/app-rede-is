import { Injectable, Logger } from "@nestjs/common";
import type { VaccinationCardEntry } from "@rede-is/shared-types";
import { PNI_CALENDAR } from "../../common/vaccination/pni-calendar";
import type { AdministeredVaccine, VaccinationCalendarSlot } from "../integrations/esus-pec/esus-pec.repository";

function normalizeForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

function addDays(isoDate: string, days: number): Date {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date;
}

function addMonths(isoDate: string, months: number): Date {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date;
}

/**
 * Monta a caderneta de vacinação cruzando o calendário vacinal com as
 * doses que o paciente de fato tomou.
 *
 * Caminho principal: calendário vindo do próprio banco (tb_calendario_vacinal
 * + tb_regra_vacinal_estrategia + tb_faixa_etaria_vacinacao — ver
 * EsusPecRepository.findVaccinationCalendar), casado por ID exato
 * (co_imunobiologico + co_dose_imunobiologico) com as doses administradas
 * — os dois lados vêm da mesma base, então os códigos batem sem ambiguidade.
 *
 * Caminho de reserva (buildCardFallback): usado só se o calendário do banco
 * vier vazio (instalação sem tb_calendario_vacinal populada) — Calendário
 * Nacional do PNI fixo, casado por palavra-chave no nome do imunobiológico
 * já que não há códigos de catálogo pra comparar nesse caso.
 */
@Injectable()
export class VaccinationService {
  private readonly logger = new Logger(VaccinationService.name);

  buildCard(
    birthDate: string | null,
    calendar: VaccinationCalendarSlot[],
    administered: AdministeredVaccine[],
  ): VaccinationCardEntry[] {
    if (!birthDate) return [];

    if (calendar.length === 0) {
      this.logger.warn("Calendário vacinal do banco veio vazio — usando calendário PNI fixo como reserva.");
      return this.buildCardFallback(birthDate, administered);
    }

    const administeredByKey = new Map<string, AdministeredVaccine>();
    for (const record of administered) {
      if (!record.immunobiologicId || !record.doseId) continue;
      const key = `${record.immunobiologicId}:${record.doseId}`;
      if (!administeredByKey.has(key)) administeredByKey.set(key, record);
    }

    const now = Date.now();

    return calendar.map((slot) => {
      const key = `${slot.immunobiologicId}:${slot.doseId}`;
      const match = administeredByKey.get(key);

      if (match) {
        return {
          id: key,
          immunobiologicName: slot.immunobiologicName,
          doseLabel: slot.doseLabel,
          status: "administered" as const,
          dueDate: null,
          administeredAt: match.administeredAt,
          administeredAtHealthUnit: match.healthUnitName,
          administeredByProfessional: match.professionalName,
          sourceSystem: "esus-pec" as const,
        };
      }

      const dueDate = slot.ageStartDays != null ? addDays(birthDate, slot.ageStartDays) : null;
      return {
        id: key,
        immunobiologicName: slot.immunobiologicName,
        doseLabel: slot.doseLabel,
        status: dueDate && dueDate.getTime() < now ? ("late" as const) : ("upcoming" as const),
        dueDate: dueDate ? dueDate.toISOString() : null,
        administeredAt: null,
        administeredAtHealthUnit: null,
        administeredByProfessional: null,
        sourceSystem: "esus-pec" as const,
      };
    });
  }

  /**
   * Casamento posicional por palavra-chave: a 1ª dose administrada
   * encontrada para "Pentavalente" preenche a entrada do calendário
   * "Pentavalente · 1ª dose", a 2ª preenche "2ª dose" etc.
   */
  private buildCardFallback(birthDate: string, administered: AdministeredVaccine[]): VaccinationCardEntry[] {
    const sortedByDate = [...administered].sort(
      (a, b) => new Date(a.administeredAt).getTime() - new Date(b.administeredAt).getTime(),
    );
    const consumedCount = new Map<string, number>();
    const now = Date.now();

    return PNI_CALENDAR.map((def) => {
      const groupKey = def.matchKeywords[0]!;
      const candidates = sortedByDate.filter((v) =>
        def.matchKeywords.some((kw) => normalizeForCompare(v.immunobiologicName).includes(kw)),
      );
      const alreadyUsed = consumedCount.get(groupKey) ?? 0;
      const match = candidates[alreadyUsed];
      const id = `pni:${groupKey}:${def.doseLabel}`;

      if (match) {
        consumedCount.set(groupKey, alreadyUsed + 1);
        return {
          id,
          immunobiologicName: def.immunobiologicName,
          doseLabel: def.doseLabel,
          status: "administered" as const,
          dueDate: null,
          administeredAt: match.administeredAt,
          administeredAtHealthUnit: match.healthUnitName,
          administeredByProfessional: match.professionalName,
          sourceSystem: "esus-pec" as const,
        };
      }

      const dueDate = addMonths(birthDate, def.ageInMonths);
      return {
        id,
        immunobiologicName: def.immunobiologicName,
        doseLabel: def.doseLabel,
        status: dueDate.getTime() < now ? ("late" as const) : ("upcoming" as const),
        dueDate: dueDate.toISOString(),
        administeredAt: null,
        administeredAtHealthUnit: null,
        administeredByProfessional: null,
        sourceSystem: "esus-pec" as const,
      };
    });
  }
}
