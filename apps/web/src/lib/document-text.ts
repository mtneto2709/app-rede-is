import type { Document } from "@rede-is/shared-types";

/** Monta um texto formatado a partir do documento — usado por "Imprimir" e "Compartilhar", já que o e-SUS não guarda um arquivo pronto (ver `Document.content`). */
export function buildDocumentText(doc: Document): string {
  const lines = [doc.title, ""];
  const date = new Date(doc.issuedAt).toLocaleDateString("pt-BR");
  lines.push(`Data: ${date}`);
  if (doc.content?.healthUnitName) lines.push(`Unidade: ${doc.content.healthUnitName}`);
  if (doc.professionalName) {
    lines.push(`Profissional: ${doc.professionalName}${doc.content?.professionalRole ? ` — ${doc.content.professionalRole}` : ""}`);
  }
  if (doc.content?.cid10) lines.push(`CID10: ${doc.content.cid10}`);
  if (doc.content?.daysOff != null) lines.push(`Dias de afastamento: ${doc.content.daysOff}`);
  if (doc.content?.resultProfessionalName) {
    const resultDate = doc.content.resultAt ? new Date(doc.content.resultAt).toLocaleDateString("pt-BR") : "";
    lines.push(`Avaliação: ${doc.content.resultProfessionalName}${resultDate ? ` — ${resultDate}` : ""}`);
  }
  if (doc.content?.medications && doc.content.medications.length > 0) {
    lines.push("");
    for (const med of doc.content.medications) {
      lines.push(med.strength ? `${med.name} ${med.strength}` : med.name);
      for (const extra of [med.dose, med.quantity, med.continuousUse ? "Uso Contínuo" : null, med.duration, med.interrupted, med.reason]) {
        if (extra) lines.push(extra);
      }
      lines.push("");
    }
  } else if (doc.content?.exams && doc.content.exams.length > 0) {
    lines.push("");
    for (const exam of doc.content.exams) {
      lines.push(exam.name);
      if (exam.conferred != null) lines.push(exam.conferred ? "Conferido" : "Aguardando conferência");
      if (exam.requestedAt) lines.push(`Solicitado em ${new Date(exam.requestedAt).toLocaleDateString("pt-BR")}`);
      if (exam.performedAt) lines.push(`Realizado em ${new Date(exam.performedAt).toLocaleDateString("pt-BR")}`);
      if (exam.resultAt) lines.push(`Resultado em ${new Date(exam.resultAt).toLocaleDateString("pt-BR")}`);
      if (exam.result) lines.push(exam.result);
      if (exam.observation) lines.push(exam.observation);
      lines.push("");
    }
  } else if (doc.content?.text) {
    lines.push("", doc.content.text);
  }
  return lines.join("\n");
}

export function printDocument(doc: Document): void {
  const win = window.open("", "_blank", "width=600,height=800");
  if (!win) return;
  const text = buildDocumentText(doc);
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(doc.title)}</title>
    <style>body{font-family:system-ui,sans-serif;white-space:pre-wrap;padding:32px;line-height:1.6;font-size:14px}</style>
    </head><body>${escapeHtml(text)}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export async function shareDocument(doc: Document): Promise<void> {
  const text = buildDocumentText(doc);
  if (navigator.share) {
    try {
      await navigator.share({ title: doc.title, text });
      return;
    } catch {
      // usuário cancelou o compartilhamento nativo — cai pro clipboard abaixo
    }
  }
  await navigator.clipboard.writeText(text);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
