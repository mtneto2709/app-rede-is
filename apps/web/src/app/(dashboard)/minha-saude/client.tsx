"use client";

import { HeartPulse, Pill, FlaskConical, AlertTriangle, Activity, Weight, Ruler, Thermometer, Droplet } from "lucide-react";
import type { HealthSummary } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function MeasurementStat({ icon: Icon, label, value }: { icon: typeof Weight; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 bg-surface rounded-xl p-3">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div>
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-[10px] text-text-secondary uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
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
            {data.measurements && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold">Últimas medições</h2>
                  </div>
                  {data.measurements.measuredAt && (
                    <span className="text-[11px] text-text-secondary">{formatDate(data.measurements.measuredAt)}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MeasurementStat icon={Weight} label="Peso" value={data.measurements.weightKg != null ? `${data.measurements.weightKg} kg` : null} />
                  <MeasurementStat icon={Ruler} label="Altura" value={data.measurements.heightCm != null ? `${data.measurements.heightCm} cm` : null} />
                  <MeasurementStat
                    icon={HeartPulse}
                    label="Pressão arterial"
                    value={
                      data.measurements.bloodPressureSystolic != null && data.measurements.bloodPressureDiastolic != null
                        ? `${data.measurements.bloodPressureSystolic}/${data.measurements.bloodPressureDiastolic} mmHg`
                        : null
                    }
                  />
                  <MeasurementStat icon={Activity} label="Freq. cardíaca" value={data.measurements.heartRate != null ? `${data.measurements.heartRate} bpm` : null} />
                  <MeasurementStat icon={Thermometer} label="Temperatura" value={data.measurements.temperature != null ? `${data.measurements.temperature} °C` : null} />
                  <MeasurementStat icon={Droplet} label="Glicemia capilar" value={data.measurements.capillaryGlucose != null ? `${data.measurements.capillaryGlucose} mg/dL` : null} />
                </div>
              </section>
            )}

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-bold">Alergias e reações adversas</h2>
              </div>
              {data.allergies.length === 0 ? (
                <p className="text-xs text-text-secondary">Nenhuma alergia registrada.</p>
              ) : (
                <div className="space-y-2">
                  {data.allergies.map((a) => (
                    <Card key={a.id} className="p-3 border-l-4 border-l-warning">
                      <p className="text-sm">{a.label}</p>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-danger" />
                <h2 className="text-sm font-bold">Problemas e condições</h2>
              </div>
              {data.conditions.length === 0 ? (
                <p className="text-xs text-text-secondary">Nenhuma condição registrada.</p>
              ) : (
                <div className="space-y-2">
                  {data.conditions.map((c) => (
                    <Card key={c.id} className="p-3">
                      <p className="text-sm">{c.label}</p>
                      {c.startedAt && (
                        <p className="text-xs text-text-secondary mt-0.5">Início: {formatDate(c.startedAt)}</p>
                      )}
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
