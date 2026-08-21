import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Env } from "@rede-is/config";
import { ENV } from "../../../common/env/env.module";
import type { OtpChannelSender } from "./otp-channel.interface";

/**
 * TODO: integrar com o provedor real definido em `SMS_PROVIDER`
 * (ex.: Twilio, Zenvia, TotalVoice). Em desenvolvimento (sem credenciais
 * configuradas), apenas loga — nunca falha silenciosamente em produção.
 */
@Injectable()
export class SmsProvider implements OtpChannelSender {
  private readonly logger = new Logger(SmsProvider.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send(contact: string, code: string): Promise<void> {
    if (!this.env.SMS_API_KEY) {
      if (this.env.NODE_ENV === "production") {
        throw new Error("SMS_API_KEY não configurado em produção");
      }
      this.logger.warn(`[DEV] Código SMS para ${contact}: ${code}`);
      return;
    }

    // TODO(integração real): chamar a API do provedor configurado em
    // SMS_PROVIDER com SMS_API_KEY/SMS_API_SECRET.
    throw new Error(`Provedor de SMS "${this.env.SMS_PROVIDER}" ainda não implementado`);
  }
}
