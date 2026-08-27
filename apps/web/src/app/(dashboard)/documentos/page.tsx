"use client";

import { useState } from "react";
import { Pill, FlaskConical, Award, Send, Eye, Printer, Share2, X, type LucideIcon } from "lucide-react";
import type { Document } from "@rede-is/shared-types";
import { useMeQuery } from "@/lib/use-me-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_BG, TONE_TEXT, type Tone } from "@/lib/tone";
import { printDocument, shareDocument } from "@/lib/document-text";

const TYPE_LABEL: Record<Document["type"], string> = {
  prescription: "Receita",
  exam: "Exame",
  certificate: "Atestado",
  referral: "Encaminhamento",
  report: "Relatório",
};

const TYPE_ICON: Record<Document["type"], LucideIcon> = {
  prescription: Pill,
  exam: FlaskConical,
  certificate: Award,
  referral: Send,
  report: FlaskConical,
};

const TYPE_TONE: Record<Document["type"], Tone> = {
  prescription: "success",
  exam: "secondary",
  certificate: "warning",
  referral: "primary",
  report: "primary",
};

function DocumentViewer({ doc, onClose }: { doc: Document; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-surface rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-bold pr-4">{doc.title}</h2>
          <button onClick={onClose} className="text-text-secondary shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="text-xs text-text-secondary space-y-1">
          <p>Data: {new Date(doc.issuedAt).toLocaleDateString("pt-BR")}</p>
          {doc.content?.healthUnitName && <p>Unidade: {doc.content.healthUnitName}</p>}
          {doc.professionalName && (
            <p>
              Profissional: {doc.professionalName}
              {doc.content?.professionalRole ? ` — ${doc.content.professionalRole}` : ""}
            </p>
          )}
          {doc.content?.cid10 && <p>CID10: {doc.content.cid10}</p>}
          {doc.content?.daysOff != null && <p>Dias de afastamento: {doc.content.daysOff}</p>}
        </div>

        {doc.content?.text && (
          <p className="text-sm whitespace-pre-wrap bg-app rounded-xl p-3">{doc.content.text}</p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => printDocument(doc)}
            className="flex items-center justify-center gap-2 rounded-full border border-black/10 py-2.5 text-sm font-semibold"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button
            onClick={() => shareDocument(doc)}
            className="flex items-center justify-center gap-2 rounded-full border border-black/10 py-2.5 text-sm font-semibold"
          >
            <Share2 className="h-4 w-4" /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { data, isLoading, error } = useMeQuery<Document[]>("documents");
  const [selected, setSelected] = useState<Document | null>(null);

  return (
    <div>
      <PageHeader title="Documentos" />
      <div className="px-6 space-y-3">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data?.length === 0 && <p className="text-sm text-text-secondary">Nenhum documento encontrado.</p>}
        {data?.map((doc) => {
          const tone = TYPE_TONE[doc.type];
          const Icon = TYPE_ICON[doc.type];
          return (
            <Card key={doc.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${TONE_BG[tone]}`}>
                  <Icon className={`h-4 w-4 ${TONE_TEXT[tone]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{doc.title}</p>
                  <p className="text-xs text-text-secondary">
                    {TYPE_LABEL[doc.type]} · {new Date(doc.issuedAt).toLocaleDateString("pt-BR")}
                  </p>
                  {doc.professionalName && (
                    <p className="text-xs text-text-secondary mt-0.5">{doc.professionalName}</p>
                  )}
                  {doc.content?.healthUnitName && (
                    <p className="text-xs text-text-secondary">{doc.content.healthUnitName}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelected(doc)}
                  className="flex items-center justify-center gap-1 rounded-full border border-primary/30 text-primary text-xs font-semibold py-2"
                >
                  <Eye className="h-3.5 w-3.5" /> Abrir
                </button>
                <button
                  onClick={() => printDocument(doc)}
                  className="flex items-center justify-center gap-1 rounded-full border border-black/10 text-text-secondary text-xs font-semibold py-2"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => shareDocument(doc)}
                  className="flex items-center justify-center gap-1 rounded-full border border-black/10 text-text-secondary text-xs font-semibold py-2"
                >
                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      {selected && <DocumentViewer doc={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
