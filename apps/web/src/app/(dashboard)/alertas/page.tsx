"use client";

import { Pill, Calendar, Syringe, FileText, type LucideIcon } from "lucide-react";
import type { Alert } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_BG, TONE_TEXT, TONE_BORDER } from "@/lib/tone";

const PRIORITY_TONE: Record<Alert["priority"], "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
};

const PRIORITY_LABEL: Record<Alert["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const TYPE_ICON: Record<Alert["type"], LucideIcon> = {
  medication: Pill,
  appointment: Calendar,
  vaccine: Syringe,
  exam: FileText,
};

export default function AlertsPage() {
  const { data, isLoading, error } = useMeQuery<Alert[]>("alerts");

  return (
    <div>
      <PageHeader title="Alertas" />
      <div className="px-6 space-y-3">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data?.length === 0 && <p className="text-sm text-text-secondary">Nenhum alerta no momento.</p>}
        {data?.map((alert) => {
          const tone = PRIORITY_TONE[alert.priority];
          const Icon = TYPE_ICON[alert.type];
          return (
            <Card key={alert.id} className={`p-4 border-l-4 ${TONE_BORDER[tone]} flex gap-3`}>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${TONE_BG[tone]}`}>
                <Icon className={`h-4 w-4 ${TONE_TEXT[tone]}`} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <Badge tone={tone}>{PRIORITY_LABEL[alert.priority]}</Badge>
                </div>
                <p className="text-xs text-text-secondary">{alert.message}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
