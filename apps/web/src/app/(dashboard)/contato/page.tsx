import { Phone, Mail, MessageCircle } from "lucide-react";
import { getCurrentTenantTheme } from "@/lib/theme";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default async function ContactPage() {
  const theme = await getCurrentTenantTheme();
  const { phone, whatsapp, email } = theme.contactSupport;

  return (
    <div>
      <PageHeader title="Entre em Contato" />
      <div className="px-6 space-y-3">
        {phone && (
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Central de Atendimento</p>
              <p className="text-xs text-text-secondary">{phone}</p>
            </div>
          </Card>
        )}
        {whatsapp && (
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-xs text-text-secondary">{whatsapp}</p>
            </div>
          </Card>
        )}
        {email && (
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium">E-mail</p>
              <p className="text-xs text-text-secondary">{email}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
