"use client";

import { useState } from "react";
import { AlertCircle, Pill, FlaskConical, Award, Send, Eye, Printer, Share2, X, type LucideIcon } from "lucide-react";
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

const ALL_TYPES = Object.keys(TYPE_LABEL) as Document["type"][];

const TYPE_FILTER_ACTIVE: Record<Tone, string> = {
  primary: "bg-primary text-white border-primary",
  secondary: "bg-secondary text-white border-secondary",
  success: "bg-success text-white border-success",
  warning: "bg-warning text-white border-warning",
  danger: "bg-danger text-white border-danger",
};

const TYPE_FILTER_INACTIVE: Record<Tone, string> = {
  primary: "bg-white text-primary border-primary",
  secondary: "bg-white text-secondary border-secondary",
  success: "bg-white text-success border-success",
  warning: "bg-white text-warning border-warning",
  danger: "bg-white text-danger border-danger",
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
          {doc.content?.resultProfessionalName && (
            <p>
              Avaliação: {doc.content.resultProfessionalName}
              {doc.content.resultAt ? ` — ${new Date(doc.content.resultAt).toLocaleDateString("pt-BR")}` : ""}
            </p>
          )}
        </div>

        {doc.content?.medications && doc.content.medications.length > 0 ? (
          <div className="space-y-2">
            {doc.content.medications.map((med) => (
              <Card key={med.id} className="p-3 space-y-1 border-l-4 border-l-success">
                <p className="text-sm font-semibold">{med.name}</p>
                {med.dose && <p className="text-xs text-text-secondary">{med.dose}</p>}
                {med.quantity && <p className="text-xs text-text-secondary">{med.quantity}</p>}
                {med.duration && <p className="text-xs text-text-secondary">{med.duration}</p>}
                {med.interrupted && <p className="text-xs text-danger">{med.interrupted}</p>}
                {med.reason && <p className="text-xs text-text-secondary">{med.reason}</p>}
              </Card>
            ))}
          </div>
        ) : doc.content?.exams && doc.content.exams.length > 0 ? (
          <div className="space-y-2">
            {doc.content.exams.map((exam) => (
              <Card key={exam.id} className="p-3 space-y-1 border-l-4 border-l-secondary">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{exam.name}</p>
                  {exam.conferred != null && (
                    <span className={`text-[10px] font-semibold shrink-0 ${exam.conferred ? "text-success" : "text-warning"}`}>
                      {exam.conferred ? "Conferido" : "Aguardando conferência"}
                    </span>
                  )}
                </div>
                {exam.requestedAt && (
                  <p className="text-xs text-text-secondary">
                    Solicitado em {new Date(exam.requestedAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {exam.performedAt && (
                  <p className="text-xs text-text-secondary">
                    Realizado em {new Date(exam.performedAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {exam.resultAt && (
                  <p className="text-xs text-text-secondary">
                    Resultado em {new Date(exam.resultAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {exam.result && <p className="text-sm whitespace-pre-wrap bg-app rounded-xl p-2 mt-1">{exam.result}</p>}
                {exam.observation && <p className="text-xs text-text-secondary">{exam.observation}</p>}
              </Card>
            ))}
          </div>
        ) : (
          doc.content?.text && <p className="text-sm whitespace-pre-wrap bg-app rounded-xl p-3">{doc.content.text}</p>
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
  const [activeTypes, setActiveTypes] = useState<Set<Document["type"]>>(new Set(ALL_TYPES));

  function toggleType(type: Document["type"]) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const visibleDocs = data?.filter((doc) => activeTypes.has(doc.type)) ?? [];

  return (
    <div>
      <PageHeader title="Documentos" />
      <div className="px-6 space-y-3">
        <Card className="p-4 border-l-4 border-l-warning flex gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold">Atenção</p>
            <p className="text-xs text-text-secondary">
              As informações abaixo trazem os registros de documentos emitidos pelo sistema, com todas as
              informações registradas. Estes não substituem os documentos originais que foram entregues assinados
              pelo profissional que emitiu.
            </p>
          </div>
        </Card>

        {data && data.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((type) => {
              const active = activeTypes.has(type);
              const tone = TYPE_TONE[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? TYPE_FILTER_ACTIVE[tone] : TYPE_FILTER_INACTIVE[tone]
                  }`}
                >
                  {TYPE_LABEL[type]}
                </button>
              );
            })}
          </div>
        )}

        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!isLoading && data?.length === 0 && <p className="text-sm text-text-secondary">Nenhum documento encontrado.</p>}
        {!isLoading && data && data.length > 0 && visibleDocs.length === 0 && (
          <p className="text-sm text-text-secondary">Nenhum documento para os filtros selecionados.</p>
        )}
        {visibleDocs.map((doc) => {
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
                  {doc.type === "exam" && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      {doc.content?.resultProfessionalName
                        ? `Avaliação: ${doc.content.resultProfessionalName} · ${
                            doc.content.resultAt ? new Date(doc.content.resultAt).toLocaleDateString("pt-BR") : ""
                          }`
                        : "Aguardando avaliação"}
                    </p>
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
