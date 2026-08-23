"use client";

import { Stethoscope, Pill } from "lucide-react";
import type { Attendance } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function AttendancesPageClient() {
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
          <Card key={attendance.id} className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {initials(attendance.professionalName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {attendance.professionalName ?? attendance.specialty ?? "Atendimento"}
                </p>
                {attendance.specialty && <p className="text-xs text-text-secondary">{attendance.specialty}</p>}
              </div>
              <Badge tone="neutral" className="shrink-0">
                {new Date(attendance.occurredAt).toLocaleDateString("pt-BR")}
              </Badge>
            </div>
            {attendance.diagnosis && (
              <div className="bg-secondary/5 rounded-xl p-3 flex gap-2">
                <Stethoscope className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-xs">
                  <span className="font-semibold">Diagnóstico: </span>
                  {attendance.diagnosis}
                </p>
              </div>
            )}
            {attendance.prescription && (
              <div className="bg-success/5 rounded-xl p-3 flex gap-2">
                <Pill className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <p className="text-xs">
                  <span className="font-semibold">Prescrição: </span>
                  {attendance.prescription}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
