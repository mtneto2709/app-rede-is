import { Facebook, Instagram, Twitter, Youtube, Linkedin, Link2, ChevronRight, type LucideIcon } from "lucide-react";
import { getCurrentTenantTheme } from "@/lib/theme";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

/**
 * Cores das próprias redes sociais (identidade da marca de terceiros, não
 * do tenant) — usadas só aqui pra manter os ícones reconhecíveis, sem
 * conflitar com o white-label das cores do cliente.
 */
const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
};

const PLATFORM_ICON: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
};

export default async function SocialPage() {
  const theme = await getCurrentTenantTheme();

  return (
    <div>
      <PageHeader title="Redes Sociais" />
      <div className="px-6 space-y-3">
        {theme.socialLinks.length === 0 && (
          <p className="text-sm text-text-secondary">Nenhuma rede social cadastrada.</p>
        )}
        {theme.socialLinks.map((link) => {
          const color = PLATFORM_COLOR[link.platform] ?? "#6b7280";
          const Icon = PLATFORM_ICON[link.platform] ?? Link2;
          return (
            <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer">
              <Card className="p-4 flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}1A` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-xs text-text-secondary truncate">{link.url}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-text-secondary shrink-0" />
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}
