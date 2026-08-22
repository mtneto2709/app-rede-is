"use client";

import Link from "next/link";
import {
  Calendar,
  Video,
  UserCheck,
  BriefcaseMedical,
  CreditCard,
  MapPin,
  Heart,
  MoreHorizontal,
  Bell,
  FileText,
  Phone,
  Share2,
  Settings,
} from "lucide-react";
import type { DashboardStats } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_BG, TONE_TEXT, toneAt, type Tone } from "@/lib/tone";

interface Banner {
  title: string;
  description: string;
  imageUrl?: string;
}

const QUICK_ACCESS = [
  { key: "attendancesCount", label: "Atendimentos", href: "/atendimentos", icon: UserCheck, tone: "primary" },
  { key: "appointmentsCount", label: "Agendamentos", href: "/agendamentos", icon: Calendar, tone: "secondary" },
  { key: "alertsCount", label: "Alertas", href: "/alertas", icon: Bell, tone: "warning" },
  { key: "documentsCount", label: "Documentos", href: "/documentos", icon: FileText, tone: "success" },
] as const satisfies { key: keyof DashboardStats; label: string; href: string; icon: typeof Calendar; tone: Tone }[];

const SERVICES = [
  { name: "Agendamentos", icon: Calendar, href: "/agendamentos" },
  { name: "Teleconsulta", icon: Video, href: "/agendamentos" },
  { name: "Atendimentos", icon: UserCheck, href: "/atendimentos" },
  { name: "Vacinação", icon: BriefcaseMedical, href: "/vacinacao" },
  { name: "Meus Cartões", icon: CreditCard, href: "/perfil" },
  { name: "Unidades", icon: MapPin, href: "/unidades" },
  { name: "Minha Saúde", icon: Heart, href: "/documentos" },
  { name: "Mais Serviços", icon: MoreHorizontal, href: "/perfil" },
];

export function DashboardHome({
  appName,
  logoUrl,
  banners,
}: {
  appName: string;
  logoUrl: string;
  banners: Banner[];
}) {
  const { data: stats, isLoading } = useMeQuery<DashboardStats>("dashboard");

  return (
    <div>
      <header className="bg-gradient-to-br from-primary to-secondary text-primary-foreground px-6 pt-6 pb-9 rounded-b-[32px]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={appName}
              className="h-11 w-11 rounded-full bg-white object-contain p-1.5 ring-2 ring-white/30"
            />
            <div>
              <p className="text-sm opacity-90">Bem-vindo(a)</p>
              <h1 className="text-lg font-semibold">{appName}</h1>
            </div>
          </div>
          <Link href="/perfil" className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {banners[0] && (
        <section className="px-6 -mt-5 mb-6">
          <div className="rounded-2xl bg-surface shadow-lg p-4">
            <p className="font-semibold text-sm">{banners[0].title}</p>
            <p className="text-xs text-text-secondary mt-1">{banners[0].description}</p>
          </div>
        </section>
      )}

      <section className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          {QUICK_ACCESS.map((item) => (
            <Link key={item.key} href={item.href} className="rounded-2xl bg-surface shadow-sm p-4 flex flex-col gap-2">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${TONE_BG[item.tone]}`}>
                <item.icon className={`h-4 w-4 ${TONE_TEXT[item.tone]}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <div className={`text-2xl font-black ${TONE_TEXT[item.tone]}`}>
                  {String(stats?.[item.key] ?? 0).padStart(2, "0")}
                </div>
              )}
              <div className="text-xs text-text-secondary font-medium">{item.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 mb-8">
        <div className="grid grid-cols-4 gap-4">
          {SERVICES.map((service, index) => {
            const tone = toneAt(index);
            return (
              <Link key={service.name} href={service.href} className="flex flex-col items-center gap-2">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${TONE_BG[tone]}`}>
                  <service.icon className={`h-5 w-5 ${TONE_TEXT[tone]}`} />
                </div>
                <span className="text-xs text-center text-text-secondary leading-tight">{service.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/contato"
            className="flex items-center justify-center gap-2 rounded-full border border-black/10 py-3.5 text-sm font-semibold"
          >
            <Phone className="h-4 w-4" /> Contato
          </Link>
          <Link
            href="/social"
            className="flex items-center justify-center gap-2 rounded-full border border-black/10 py-3.5 text-sm font-semibold"
          >
            <Share2 className="h-4 w-4" /> Redes Sociais
          </Link>
        </div>
      </footer>
    </div>
  );
}
