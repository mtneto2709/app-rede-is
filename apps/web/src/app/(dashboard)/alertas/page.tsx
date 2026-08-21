"use client";

import type { Alert } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PRIORITY_TONE: Record<Alert["priority"], "success" | "warning" | "danger"> = {
  low: "success",
  medium: "warning",
  high: "danger",
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
        {data?.map((alert) => (
          <Card key={alert.id} className="p-4 space-y-1">
            <div className="flex justify-between items-start">
              <p className="font-medium text-sm">{alert.title}</p>
              <Badge tone={PRIORITY_TONE[alert.priority]}>{alert.priority}</Badge>
            </div>
            <p className="text-xs text-text-secondary">{alert.message}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
