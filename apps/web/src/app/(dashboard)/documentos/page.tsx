"use client";

import { Pill, FlaskConical, Award, ClipboardList, Download, type LucideIcon } from "lucide-react";
import type { Document } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_BG, TONE_TEXT, type Tone } from "@/lib/tone";

const TYPE_LABEL: Record<Document["type"], string> = {
  prescription: "Receita",
  exam: "Exame",
  certificate: "Atestado",
  report: "Relatório",
};

const TYPE_ICON: Record<Document["type"], LucideIcon> = {
  prescription: Pill,
  exam: FlaskConical,
  certificate: Award,
  report: ClipboardList,
};

const TYPE_TONE: Record<Document["type"], Tone> = {
  prescription: "success",
  exam: "secondary",
  certificate: "warning",
  report: "primary",
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
        {data?.map((doc) => {
          const tone = TYPE_TONE[doc.type];
          const Icon = TYPE_ICON[doc.type];
          return (
            <Card key={doc.id} className="p-4 flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${TONE_BG[tone]}`}>
                <Icon className={`h-4 w-4 ${TONE_TEXT[tone]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{doc.title}</p>
                <p className="text-xs text-text-secondary">
                  {TYPE_LABEL[doc.type]} · {new Date(doc.issuedAt).toLocaleDateString("pt-BR")}
                </p>
                {doc.description && <p className="text-xs text-text-secondary mt-1">{doc.description}</p>}
              </div>
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 rounded-full border border-primary/30 text-primary text-xs font-semibold px-3 py-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Baixar
                </a>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
