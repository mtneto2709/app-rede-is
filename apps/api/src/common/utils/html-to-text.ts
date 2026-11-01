/**
 * Alguns campos de texto livre do e-SUS (digitados via editor rich-text no
 * sistema original, ex. `tb_atestado.ds_atestado`) guardam HTML cru — sem
 * isso, as tags apareciam literalmente na tela em vez de formatar o texto.
 * Converte pra texto plano, preservando quebra de parágrafo/linha, em vez
 * de tentar renderizar HTML de verdade (mais simples e sem risco de XSS).
 */
export function htmlToText(html: string | null): string | null {
  if (!html) return null;

  const text = html
    // "\n" literal (barra invertida + n, 2 caracteres) em vez de quebra de
    // linha de verdade — mesmo caso já visto em mensagens.msg_alerta
    // (quem digita por um cliente de banco/editor sem suporte a Enter
    // acaba digitando isso). Trata os dois casos.
    .replace(/\\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text || null;
}
