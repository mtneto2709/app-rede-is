import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Env } from "@rede-is/config";
import { ENV } from "../../../common/env/env.module";
import type { OtpChannelSender } from "./otp-channel.interface";

/** TODO: integrar com o provedor real definido em `EMAIL_PROVIDER` (ex.: SES, SendGrid, Resend). */
@Injectable()
export class EmailProvider implements OtpChannelSender {
  private readonly logger = new Logger(EmailProvider.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send(contact: string, code: string): Promise<void> {
    if (!this.env.EMAIL_API_KEY) {
      if (this.env.NODE_ENV === "production") {
        throw new Error("EMAIL_API_KEY não configurado em produção");
      }
      this.logger.warn(`[DEV] Código por e-mail para ${contact}: ${code}`);
      return;
    }

    // TODO(integração real): enviar via provedor configurado em
    // EMAIL_PROVIDER com EMAIL_API_KEY, remetente EMAIL_FROM.
    throw new Error(`Provedor de e-mail "${this.env.EMAIL_PROVIDER}" ainda não implementado`);
  }
}
