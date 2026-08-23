"use client";

import type { VaccinationCardEntry, VaccinationCardResponse } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<VaccinationCardEntry["status"], string> = {
  administered: "Tomada",
  late: "Atrasada",
  upcoming: "Futura",
};

const STATUS_TONE: Record<VaccinationCardEntry["status"], "success" | "warning" | "secondary"> = {
  administered: "success",
  late: "warning",
  upcoming: "secondary",
};

const STATUS_BORDER: Record<VaccinationCardEntry["status"], string> = {
  administered: "border-l-success",
  late: "border-l-warning",
  upcoming: "border-l-secondary",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function groupByImmunobiologic(entries: VaccinationCardEntry[]): [string, VaccinationCardEntry[]][] {
  const groups = new Map<string, VaccinationCardEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.immunobiologicName) ?? [];
    list.push(entry);
    groups.set(entry.immunobiologicName, list);
  }
  return [...groups.entries()];
}

export function VaccinationPageClient() {
  const { data, isLoading, error } = useMeQuery<VaccinationCardResponse>("vaccination-card");

  return (
    <div>
      <PageHeader title="Caderneta de Vacinação" />
      <div className="px-6 space-y-6">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data && !data.available && (
          <p className="text-sm text-text-secondary">
            A caderneta de vacinação ainda não está disponível para o seu cadastro. Procure sua unidade de saúde
            para consultar suas vacinas.
          </p>
        )}
        {!isLoading && data?.available && data.entries.length === 0 && (
          <p className="text-sm text-text-secondary">
            Não foi possível montar o calendário vacinal — cadastro sem data de nascimento.
          </p>
        )}
        {data?.available &&
          groupByImmunobiologic(data.entries).map(([immunoName, doses]) => (
            <section key={immunoName} className="space-y-2">
              <h2 className="text-sm font-bold">{immunoName}</h2>
              <div className="space-y-2">
                {doses.map((dose) => (
                  <Card key={dose.id} className={`p-4 border-l-4 ${STATUS_BORDER[dose.status]}`}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium">{dose.doseLabel}</p>
                      <Badge tone={STATUS_TONE[dose.status]}>{STATUS_LABEL[dose.status]}</Badge>
                    </div>
                    {dose.status === "administered" ? (
                      <div className="text-xs text-text-secondary mt-1 space-y-0.5">
                        <p>Aplicada em {formatDate(dose.administeredAt)}</p>
                        {dose.administeredAtHealthUnit && <p>{dose.administeredAtHealthUnit}</p>}
                        {dose.administeredByProfessional && <p>{dose.administeredByProfessional}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary mt-1">Prevista para {formatDate(dose.dueDate)}</p>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
