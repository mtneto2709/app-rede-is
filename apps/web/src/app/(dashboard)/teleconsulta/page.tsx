import { Video } from "lucide-react";
import { requireFeature } from "@/lib/require-feature";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default async function TeleconsultaPage() {
  await requireFeature("teleconsulta");

  return (
    <div>
      <PageHeader title="Teleconsulta" />
      <div className="px-6">
        <Card className="p-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium">Em breve</p>
          <p className="text-xs text-text-secondary">
            A teleconsulta ainda está sendo implementada. Em breve você poderá marcar e realizar consultas por
            vídeo diretamente por aqui.
          </p>
        </Card>
      </div>
    </div>
  );
}
