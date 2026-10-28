"use client";

import { useState } from "react";
import type { VaccinationCardEntry, VaccinationCardResponse } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<VaccinationCardEntry["status"], string> = {
  administered: "Tomada",
  late: "Atrasada",
  upcoming: "Futura",
};

const ALL_STATUSES = Object.keys(STATUS_LABEL) as VaccinationCardEntry["status"][];

const STATUS_BORDER: Record<VaccinationCardEntry["status"], string> = {
  administered: "border-l-success",
  late: "border-l-warning",
  upcoming: "border-l-secondary",
};

const STATUS_FILTER_ACTIVE: Record<VaccinationCardEntry["status"], string> = {
  administered: "bg-success text-white border-success",
  late: "bg-warning text-white border-warning",
  upcoming: "bg-secondary text-white border-secondary",
};

const STATUS_FILTER_INACTIVE: Record<VaccinationCardEntry["status"], string> = {
  administered: "bg-white text-success border-success",
  late: "bg-white text-warning border-warning",
  upcoming: "bg-white text-secondary border-secondary",
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
  const [activeStatuses, setActiveStatuses] = useState<Set<VaccinationCardEntry["status"]>>(new Set(ALL_STATUSES));

  function toggleStatus(status: VaccinationCardEntry["status"]) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const visibleEntries = data?.available ? data.entries.filter((e) => activeStatuses.has(e.status)) : [];

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
        {data?.available && data.entries.length > 0 && (
          <div className="flex gap-2">
            {ALL_STATUSES.map((status) => {
              const active = activeStatuses.has(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? STATUS_FILTER_ACTIVE[status] : STATUS_FILTER_INACTIVE[status]
                  }`}
                >
                  {STATUS_LABEL[status]}
                </button>
              );
            })}
          </div>
        )}
        {groupByImmunobiologic(visibleEntries).map(([immunoName, doses]) => (
          <section key={immunoName} className="space-y-2">
            <h2 className="text-sm font-bold">{immunoName}</h2>
            <div className="grid grid-cols-3 gap-3">
              {doses.map((dose) => (
                <Card key={dose.id} className={`p-3 border-l-4 ${STATUS_BORDER[dose.status]} space-y-1.5`}>
                  <p className="text-sm font-medium leading-tight">{dose.doseLabel}</p>
                  {dose.status === "administered" ? (
                    <div className="text-xs text-text-secondary space-y-0.5">
                      <p>Aplicada em {formatDate(dose.administeredAt)}</p>
                      {dose.administeredAtHealthUnit && <p className="truncate">{dose.administeredAtHealthUnit}</p>}
                      {dose.administeredByProfessional && (
                        <p className="truncate">{dose.administeredByProfessional}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary">Prevista para {formatDate(dose.dueDate)}</p>
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
