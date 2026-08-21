"use client";

import { FileText } from "lucide-react";
import type { Document } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_LABEL: Record<Document["type"], string> = {
  prescription: "Receita",
  exam: "Exame",
  certificate: "Atestado",
  report: "Relatório",
};

export default function DocumentsPage() {
  const { data, isLoading, error } = useMeQuery<Document[]>("documents");

  return (
    <div>
      <PageHeader title="Documentos" />
      <div className="px-6 space-y-3">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data?.length === 0 && <p className="text-sm text-text-secondary">Nenhum documento encontrado.</p>}
        {data?.map((doc) => (
          <Card key={doc.id} className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{doc.title}</p>
              <p className="text-xs text-text-secondary">
                {TYPE_LABEL[doc.type]} · {new Date(doc.issuedAt).toLocaleDateString("pt-BR")}
              </p>
              {doc.description && <p className="text-xs text-text-secondary mt-1">{doc.description}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
