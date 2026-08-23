"use client";

import { useState } from "react";
import type { Appointment } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Agendado",
  completed: "Compareceu",
  cancelled: "Cancelado",
  missed: "Não compareceu",
};

const STATUS_TONE: Record<Appointment["status"], "success" | "warning" | "danger" | "neutral"> = {
  scheduled: "success",
  completed: "neutral",
  cancelled: "danger",
  missed: "warning",
};

type Tab = "futuros" | "passados";

export function AppointmentsPageClient() {
  const { data, isLoading, error } = useMeQuery<Appointment[]>("appointments");
  const [tab, setTab] = useState<Tab>("futuros");

  const now = Date.now();
  const futuros = data?.filter((a) => new Date(a.scheduledAt).getTime() > now) ?? [];
  const passados = data?.filter((a) => new Date(a.scheduledAt).getTime() <= now) ?? [];
  const items = tab === "futuros" ? futuros : passados;

  return (
    <div>
      <PageHeader title="Agendamentos" />
      <div className="px-6">
        <div className="flex rounded-full bg-black/5 p-1 mb-4">
          <button
            type="button"
            onClick={() => setTab("futuros")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              tab === "futuros" ? "bg-surface shadow-sm text-primary" : "text-text-secondary"
            }`}
          >
            Futuros
          </button>
          <button
            type="button"
            onClick={() => setTab("passados")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              tab === "passados" ? "bg-surface shadow-sm text-primary" : "text-text-secondary"
            }`}
          >
            Passados
          </button>
        </div>

        <div className="space-y-3">
          {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          {error && <p className="text-sm text-danger">{error}</p>}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-text-secondary">
              {tab === "futuros" ? "Nenhum agendamento futuro no momento." : "Nenhum agendamento passado encontrado."}
            </p>
          )}
          {items.map((appointment) => (
            <Card key={appointment.id} className="p-4 space-y-1">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm">
                  {appointment.professionalName ?? appointment.specialty ?? "Consulta"}
                </p>
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
    </div>
  );
}
