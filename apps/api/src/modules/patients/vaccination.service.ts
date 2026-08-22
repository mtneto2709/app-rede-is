import { Injectable } from "@nestjs/common";
import type { VaccinationCardEntry } from "@rede-is/shared-types";
import { PNI_CALENDAR } from "../../common/vaccination/pni-calendar";
import type { AdministeredVaccine } from "../integrations/esus-pec/esus-pec.repository";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

function addMonths(isoDate: string, months: number): Date {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  return date;
}

/**
 * Monta a caderneta de vacinação cruzando o calendário PNI (fixo, ver
 * pni-calendar.ts) com as doses que o paciente de fato tomou. Casamento
 * dose-a-dose é posicional dentro de cada imunobiológico: a 1ª dose
 * administrada encontrada para "Pentavalente" preenche a entrada do
 * calendário "Pentavalente · 1ª dose", a 2ª preenche "2ª dose" etc. — mais
 * robusto contra variação no texto exato de "dose" vindo do banco do que
 * tentar casar por número de dose.
 */
@Injectable()
export class VaccinationService {
  buildCard(birthDate: string | null, administered: AdministeredVaccine[]): VaccinationCardEntry[] {
    if (!birthDate) return [];

    const sortedByDate = [...administered].sort(
      (a, b) => new Date(a.administeredAt).getTime() - new Date(b.administeredAt).getTime(),
    );
    const consumedCount = new Map<string, number>();
    const now = Date.now();

    return PNI_CALENDAR.map((def) => {
      const groupKey = def.matchKeywords[0]!;
      const candidates = sortedByDate.filter((v) =>
        def.matchKeywords.some((kw) => normalize(v.immunobiologicName).includes(kw)),
      );
      const alreadyUsed = consumedCount.get(groupKey) ?? 0;
      const match = candidates[alreadyUsed];
      const id = `${groupKey}:${def.doseLabel}`;

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
