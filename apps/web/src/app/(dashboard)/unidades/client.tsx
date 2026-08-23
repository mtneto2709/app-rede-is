"use client";

import { MapPin, Phone } from "lucide-react";
import type { HealthUnit } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_LABEL: Record<HealthUnit["type"], string> = {
  ubs: "UBS",
  hospital: "Hospital",
  clinic: "Clínica",
  laboratory: "Laboratório",
  other: "Outro",
};

/** Link universal do Google Maps — abre o app instalado no celular ou o site no navegador. */
function mapsUrl(unit: HealthUnit): string {
  const query =
    unit.latitude != null && unit.longitude != null
      ? `${unit.latitude},${unit.longitude}`
      : [unit.name, unit.address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function HealthUnitsPageClient() {
  const { data, isLoading, error } = useMeQuery<HealthUnit[]>("health-units");

  return (
    <div>
      <PageHeader title="Unidades de Saúde" />
      <div className="px-6 space-y-3">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data?.length === 0 && <p className="text-sm text-text-secondary">Nenhuma unidade encontrada.</p>}
        {data?.map((unit) => (
          <Card key={unit.id} className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <p className="font-medium text-sm">{unit.name}</p>
              <span className="text-xs text-text-secondary">{TYPE_LABEL[unit.type]}</span>
            </div>
            {unit.address && (
              <p className="text-xs text-text-secondary flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {unit.address}
              </p>
            )}
            {unit.phone && (
              <p className="text-xs text-text-secondary flex items-center gap-1">
                <Phone className="h-3 w-3" /> {unit.phone}
              </p>
            )}
            {unit.specialties.length > 0 && (
              <p className="text-xs text-text-secondary">{unit.specialties.join(", ")}</p>
            )}
            <a
              href={mapsUrl(unit)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              <MapPin className="h-3 w-3" /> Abrir no mapa
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
