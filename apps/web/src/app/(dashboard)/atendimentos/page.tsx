"use client";

import type { Attendance } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AttendancesPage() {
  const { data, isLoading, error } = useMeQuery<Attendance[]>("attendances");

  return (
    <div>
      <PageHeader title="Atendimentos" />
      <div className="px-6 space-y-3">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data?.length === 0 && (
          <p className="text-sm text-text-secondary">Nenhum atendimento encontrado.</p>
        )}
        {data?.map((attendance) => (
          <Card key={attendance.id} className="p-4 space-y-1">
            <p className="font-medium text-sm">{attendance.professionalName ?? attendance.specialty ?? "Atendimento"}</p>
            <p className="text-xs text-text-secondary">{attendance.specialty}</p>
            <p className="text-xs text-text-secondary">{new Date(attendance.occurredAt).toLocaleDateString("pt-BR")}</p>
            {attendance.diagnosis && <p className="text-xs mt-2"><strong>Diagnóstico:</strong> {attendance.diagnosis}</p>}
            {attendance.prescription && <p className="text-xs"><strong>Prescrição:</strong> {attendance.prescription}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
