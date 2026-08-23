"use client";

import { HeartPulse, Pill, FlaskConical } from "lucide-react";
import type { HealthSummary } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function HealthSummaryPageClient() {
  const { data, isLoading, error } = useMeQuery<HealthSummary>("health-summary");

  return (
    <div>
      <PageHeader title="Minha Saúde" />
      <div className="px-6 space-y-6">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data && !data.available && (
          <p className="text-sm text-text-secondary">
            Essas informações ainda não estão disponíveis para o seu cadastro. Consulte sua unidade de saúde.
          </p>
        )}
        {data?.available && (
          <>
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-danger" />
                <h2 className="text-sm font-bold">Comorbidades</h2>
              </div>
              {data.conditions.length === 0 ? (
                <p className="text-xs text-text-secondary">Nenhuma comorbidade registrada.</p>
              ) : (
                <div className="space-y-2">
                  {data.conditions.map((c) => (
                    <Card key={c.id} className="p-3">
                      <p className="text-sm">{c.label}</p>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-success" />
                <h2 className="text-sm font-bold">Medicamentos de uso contínuo</h2>
              </div>
              {data.medications.length === 0 ? (
                <p className="text-xs text-text-secondary">Nenhum medicamento de uso contínuo registrado.</p>
              ) : (
                <div className="space-y-2">
                  {data.medications.map((m) => (
                    <Card key={m.id} className="p-3">
                      <p className="text-sm font-medium">{m.name}</p>
                      {m.dosage && <p className="text-xs text-text-secondary">{m.dosage}</p>}
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-secondary" />
                <h2 className="text-sm font-bold">Resultados de exames</h2>
              </div>
              {data.exams.length === 0 ? (
                <p className="text-xs text-text-secondary">Nenhum resultado de exame disponível.</p>
              ) : (
                <div className="space-y-2">
                  {data.exams.map((e) => (
                    <Card key={e.id} className="p-3">
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-text-secondary">
                        {formatDate(e.resultAt) ?? formatDate(e.requestedAt)}
                      </p>
                      {e.result && <p className="text-xs mt-1">{e.result}</p>}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
