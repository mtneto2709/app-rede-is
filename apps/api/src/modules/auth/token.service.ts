import { randomBytes, createHash } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Env } from "@rede-is/config";
import { ENV } from "../../common/env/env.module";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { AccessTokenPayload, FirstAccessTokenPayload } from "./jwt-payload.interface";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Emissão e rotação de tokens. Refresh tokens são de uso único: cada
 * `refresh()` invalida o token anterior e emite um novo par, então um
 * refresh token roubado e reutilizado pelo atacante depois do titular é
 * detectável (a sessão já estaria revogada).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async issueSessionTokens(params: {
    userId: string;
    tenantId: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const accessPayload: AccessTokenPayload = { sub: params.userId, tenantId: params.tenantId, type: "access" };
    const accessToken = this.jwt.sign(accessPayload, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: this.env.JWT_ACCESS_TTL,
    });

    const refreshToken = randomBytes(48).toString("base64url");
    await this.prisma.session.create({
      data: {
        userId: params.userId,
        refreshTokenHash: hashToken(refreshToken),
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  async issueFirstAccessToken(params: { userId: string; tenantId: string; channel: "sms" | "whatsapp" | "email" }) {
    const payload: FirstAccessTokenPayload = {
      sub: params.userId,
      tenantId: params.tenantId,
      type: "first_access",
      channel: params.channel,
    };
    return this.jwt.sign(payload, { secret: this.env.JWT_ACCESS_SECRET, expiresIn: "15m" });
  }

  verifyFirstAccessToken(token: string): FirstAccessTokenPayload {
    const payload = this.jwt.verify<FirstAccessTokenPayload>(token, { secret: this.env.JWT_ACCESS_SECRET });
    if (payload.type !== "first_access") {
      throw new UnauthorizedException("Token inválido");
    }
    return payload;
  }

  async refresh(refreshToken: string, params: { userAgent?: string; ipAddress?: string }) {
    const tokenHash = hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: tokenHash } });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessão inválida ou expirada");
    }

    // Uso único: revoga a sessão atual antes de emitir a próxima.
    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

    const user = await this.prisma.platformUser.findUniqueOrThrow({ where: { id: session.userId } });
    return this.issueSessionTokens({
      userId: user.id,
      tenantId: user.tenantId,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
