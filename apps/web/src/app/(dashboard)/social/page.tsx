import { getCurrentTenantTheme } from "@/lib/theme";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default async function SocialPage() {
  const theme = await getCurrentTenantTheme();

  return (
    <div>
      <PageHeader title="Redes Sociais" />
      <div className="px-6 space-y-3">
        {theme.socialLinks.length === 0 && (
          <p className="text-sm text-text-secondary">Nenhuma rede social cadastrada.</p>
        )}
        {theme.socialLinks.map((link) => (
          <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer">
            <Card className="p-4">
              <p className="text-sm font-medium">{link.label}</p>
              <p className="text-xs text-text-secondary">{link.url}</p>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
