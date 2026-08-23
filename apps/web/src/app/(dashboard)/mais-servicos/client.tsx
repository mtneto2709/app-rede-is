"use client";

import Link from "next/link";
import {
  Link2,
  Globe,
  Phone,
  Mail,
  Info,
  Megaphone,
  Building2,
  FileText,
  Heart,
  Star,
  MapPin,
  Shield,
  Share2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { TenantTheme } from "@rede-is/theme-tokens";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

const ICON_MAP: Record<TenantTheme["customLinks"][number]["icon"], LucideIcon> = {
  link: Link2,
  globe: Globe,
  phone: Phone,
  mail: Mail,
  info: Info,
  megaphone: Megaphone,
  building: Building2,
  "file-text": FileText,
  heart: Heart,
  star: Star,
  "map-pin": MapPin,
  shield: Shield,
};

function LinkRow({ icon: Icon, title, subtitle, href }: { icon: LucideIcon; title: string; subtitle?: string | null; href: string }) {
  const isExternal = /^https?:\/\//.test(href);
  const content = (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs text-text-secondary truncate">{subtitle}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-text-secondary shrink-0" />
    </Card>
  );

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href}>{content}</Link>
  );
}

export function MoreServicesPageClient({ customLinks }: { customLinks: TenantTheme["customLinks"] }) {
  return (
    <div>
      <PageHeader title="Mais Serviços" />
      <div className="px-6 space-y-3">
        <LinkRow icon={Phone} title="Contato" subtitle="Fale com a central de atendimento" href="/contato" />
        <LinkRow icon={Share2} title="Redes Sociais" subtitle="Siga nossos canais oficiais" href="/social" />

        {customLinks.length > 0 && (
          <>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide pt-3">Links úteis</p>
            {customLinks.map((link) => (
              <LinkRow
                key={link.url}
                icon={ICON_MAP[link.icon]}
                title={link.title}
                subtitle={link.subtitle}
                href={link.url}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
