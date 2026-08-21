import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Env } from "@rede-is/config";
import { ENV } from "../../../common/env/env.module";
import type { OtpChannelSender } from "./otp-channel.interface";

/** TODO: integrar com a WhatsApp Business Cloud API (Meta) ou Twilio. */
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

    // TODO(integração real): POST para a Cloud API usando
    // WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_API_TOKEN, com um template de
    // mensagem de autenticação pré-aprovado pela Meta.
    throw new Error("Integração com WhatsApp Business API ainda não implementada");
  }
}
