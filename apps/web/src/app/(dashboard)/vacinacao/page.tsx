"use client";

import { useState } from "react";
import type { VaccinationCardEntry, VaccinationCardResponse } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";

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
  administered: "border-t-success",
  late: "border-t-warning",
  upcoming: "border-t-secondary",
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

export default function VaccinationPage() {
  const { data, isLoading, error } = useMeQuery<VaccinationCardResponse>("vaccination-card");
  const [selected, setSelected] = useState<VaccinationCardEntry | null>(null);

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
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {doses.map((dose) => (
                  <button key={dose.id} onClick={() => setSelected(dose)} className="text-left">
                    <Card className={`p-3 border-t-4 ${STATUS_BORDER[dose.status]} h-full`}>
                      <p className="text-xs font-semibold leading-tight">{dose.doseLabel}</p>
                      <p className="text-[11px] text-text-secondary mt-1 leading-tight">
                        {dose.status === "administered" ? formatDate(dose.administeredAt) : formatDate(dose.dueDate)}
                      </p>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          ))}
      </div>

      <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected?.immunobiologicName ?? ""}>
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{selected.doseLabel}</p>
              <Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
            </div>
            <div className="text-sm text-text-secondary space-y-1">
              {selected.status === "administered" ? (
                <>
                  <p>Aplicada em {formatDate(selected.administeredAt)}</p>
                  {selected.administeredAtHealthUnit && <p>Local: {selected.administeredAtHealthUnit}</p>}
                  {selected.administeredByProfessional && <p>Profissional: {selected.administeredByProfessional}</p>}
                </>
              ) : (
                <p>Prevista para {formatDate(selected.dueDate)}</p>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
