"use client";

import type { Appointment } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  missed: "Não compareceu",
};

const STATUS_TONE: Record<Appointment["status"], "success" | "warning" | "danger" | "neutral"> = {
  scheduled: "success",
  completed: "neutral",
  cancelled: "danger",
  missed: "warning",
};

export default function AppointmentsPage() {
  const { data, isLoading, error } = useMeQuery<Appointment[]>("appointments");

  return (
    <div>
      <PageHeader title="Agendamentos" />
      <div className="px-6 space-y-3">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data?.length === 0 && (
          <p className="text-sm text-text-secondary">Nenhum agendamento encontrado.</p>
        )}
        {data?.map((appointment) => (
          <Card key={appointment.id} className="p-4 space-y-1">
            <div className="flex justify-between items-start">
              <p className="font-medium text-sm">{appointment.professionalName ?? appointment.specialty ?? "Consulta"}</p>
              <Badge tone={STATUS_TONE[appointment.status]}>{STATUS_LABEL[appointment.status]}</Badge>
            </div>
            <p className="text-xs text-text-secondary">{appointment.specialty}</p>
            <p className="text-xs text-text-secondary">
              {new Date(appointment.scheduledAt).toLocaleString("pt-BR")}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
