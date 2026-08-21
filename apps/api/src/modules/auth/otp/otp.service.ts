import { randomInt } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import type { Env } from "@rede-is/config";
import type { AuthChannel } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SmsProvider } from "./sms.provider";
import { WhatsappProvider } from "./whatsapp.provider";
import { EmailProvider } from "./email.provider";

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsProvider,
    private readonly whatsapp: WhatsappProvider,
    private readonly email: EmailProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private senderFor(channel: AuthChannel) {
    switch (channel) {
      case "sms":
        return this.sms;
      case "whatsapp":
        return this.whatsapp;
      case "email":
        return this.email;
    }
  }

  async requestCode(channel: AuthChannel, contact: string, userId?: string): Promise<void> {
    const code = randomInt(0, 10 ** this.env.OTP_LENGTH)
      .toString()
      .padStart(this.env.OTP_LENGTH, "0");

    const codeHash = await argon2.hash(code);

    await this.prisma.otpCode.create({
      data: {
        userId,
        channel: channel.toUpperCase() as never,
        contact,
        codeHash,
        maxAttempts: this.env.OTP_MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + this.env.OTP_TTL_MINUTES * 60_000),
      },
    });

    await this.senderFor(channel).send(contact, code);
  }

  /**
   * Verifica um código. Lança `UnauthorizedException` tanto para código
   * incorreto quanto para contato inexistente/expirado, com a mesma
   * mensagem — evita dar pistas a um atacante sobre qual parte falhou.
   */
  async verifyCode(channel: AuthChannel, contact: string, code: string): Promise<{ userId?: string }> {
    const candidate = await this.prisma.otpCode.findFirst({
      where: {
        channel: channel.toUpperCase() as never,
        contact,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    const genericError = new UnauthorizedException("Código inválido ou expirado");

    if (!candidate) throw genericError;
    if (candidate.attempts >= candidate.maxAttempts) throw genericError;

    const isValid = await argon2.verify(candidate.codeHash, code);

    if (!isValid) {
      await this.prisma.otpCode.update({
        where: { id: candidate.id },
        data: { attempts: { increment: 1 } },
      });
      throw genericError;
    }

    await this.prisma.otpCode.update({ where: { id: candidate.id }, data: { usedAt: new Date() } });
    return { userId: candidate.userId ?? undefined };
  }
}
