"use client";

import {
  Stethoscope,
  Pill,
  MapPin,
  Activity,
  Home,
  HeartPulse,
  Syringe,
  Smile,
  Baby,
  FlaskConical,
  Bandage,
  Users,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Attendance, AttendanceCategory } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_BG, TONE_TEXT, TONE_BORDER, type Tone } from "@/lib/tone";

/** Ícone + cor por categoria de atendimento — mesma classificação usada no backend (ver AttendanceCategory). */
const CATEGORY_STYLE: Record<AttendanceCategory, { icon: LucideIcon; tone: Tone }> = {
  consultation: { icon: Stethoscope, tone: "primary" },
  procedure: { icon: Activity, tone: "warning" },
  homeVisit: { icon: Home, tone: "success" },
  prenatal: { icon: HeartPulse, tone: "secondary" },
  vaccination: { icon: Syringe, tone: "success" },
  dental: { icon: Smile, tone: "secondary" },
  childCare: { icon: Baby, tone: "secondary" },
  exam: { icon: FlaskConical, tone: "secondary" },
  dressing: { icon: Bandage, tone: "danger" },
  group: { icon: Users, tone: "warning" },
  other: { icon: Stethoscope, tone: "primary" },
};

export function AttendancesPageClient() {
  const { data, isLoading, error } = useMeQuery<Attendance[]>("attendances");

  return (
    <div>
      <PageHeader title="Atendimentos" />
      <div className="px-6 space-y-3">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data?.length === 0 && (
          <p className="text-sm text-text-secondary">Nenhum atendimento encontrado.</p>
        )}
        {data?.map((attendance) => {
          const { icon: Icon, tone } = CATEGORY_STYLE[attendance.category];
          const occurred = new Date(attendance.occurredAt);
          return (
            <Card key={attendance.id} className={`p-4 space-y-3 border-l-4 ${TONE_BORDER[tone]}`}>
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${TONE_BG[tone]}`}>
                  <Icon className={`h-5 w-5 ${TONE_TEXT[tone]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{attendance.typeLabel ?? "Atendimento"}</p>
                  {attendance.healthUnitName && (
                    <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" /> {attendance.healthUnitName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge tone="neutral">{occurred.toLocaleDateString("pt-BR")}</Badge>
                  <Badge tone="neutral">
                    {occurred.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                </div>
              </div>

              {(attendance.professionalName || attendance.specialty) && (
                <div className="flex items-center gap-2 text-xs border-t border-black/5 pt-2">
                  <User className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                  <span className="font-medium">{attendance.professionalName ?? "Profissional não identificado"}</span>
                  {attendance.specialty && <span className="text-text-secondary">· {attendance.specialty}</span>}
                </div>
              )}

              {(attendance.ciap2 || attendance.diagnosis) && (
                <div className="bg-secondary/5 rounded-xl p-3 flex gap-2">
                  <Stethoscope className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    {attendance.ciap2 && (
                      <p>
                        <span className="font-semibold">CIAP2: </span>
                        {attendance.ciap2}
                      </p>
                    )}
                    {attendance.diagnosis && (
                      <p>
                        <span className="font-semibold">CID10: </span>
                        {attendance.diagnosis}
                      </p>
                    )}
                  </div>
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
          );
        })}
      </div>
    </div>
  );
}
