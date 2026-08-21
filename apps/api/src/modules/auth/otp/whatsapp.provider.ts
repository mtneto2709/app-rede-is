import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Env } from "@rede-is/config";
import { ENV } from "../../../common/env/env.module";
import type { OtpChannelSender } from "./otp-channel.interface";

const GRAPH_API_VERSION = "v21.0";

/** Mantém só dígitos com DDI, sem "+" — formato exigido pela Cloud API. */
function normalizePhoneNumber(contact: string): string {
  return contact.replace(/\D/g, "");
}

/**
 * Envia o código via WhatsApp Business Cloud API (Meta), usando um template
 * de autenticação pré-aprovado — obrigatório para o primeiro contato com o
 * usuário, já que mensagem de texto livre só é permitida dentro de uma
 * janela de 24h após o cliente escrever primeiro.
 *
 * Requer: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_TOKEN (token permanente de
 * um System User, não o token de teste de 24h), WHATSAPP_TEMPLATE_NAME e
 * WHATSAPP_TEMPLATE_LANGUAGE (ex.: "pt_BR").
 *
 * Assume um template com uma única variável no corpo (o código). Se o seu
 * template de autenticação também tiver o botão "Copiar código"
 * (recurso nativo de OTP da Meta), adicione um segundo componente ao body
 * abaixo:
 *   { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] }
 */
@Injectable()
export class WhatsappProvider implements OtpChannelSender {
  private readonly logger = new Logger(WhatsappProvider.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send(contact: string, code: string): Promise<void> {
    if (!this.env.WHATSAPP_API_TOKEN) {
      if (this.env.NODE_ENV === "production") {
        throw new Error("WHATSAPP_API_TOKEN não configurado em produção");
      }
      this.logger.warn(`[DEV] Código WhatsApp para ${contact}: ${code}`);
      return;
    }

    if (!this.env.WHATSAPP_PHONE_NUMBER_ID || !this.env.WHATSAPP_TEMPLATE_NAME || !this.env.WHATSAPP_TEMPLATE_LANGUAGE) {
      throw new Error(
        "WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME e WHATSAPP_TEMPLATE_LANGUAGE são obrigatórios para enviar por WhatsApp",
      );
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhoneNumber(contact),
        type: "template",
        template: {
          name: this.env.WHATSAPP_TEMPLATE_NAME,
          language: { code: this.env.WHATSAPP_TEMPLATE_LANGUAGE },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.logger.error(`Falha ao enviar WhatsApp (status ${response.status}): ${body}`);
      throw new Error("Não foi possível enviar o código por WhatsApp");
    }
  }
}
