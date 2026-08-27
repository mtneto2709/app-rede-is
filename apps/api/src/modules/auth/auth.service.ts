import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { LoginResult } from "@rede-is/shared-types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import { OtpService } from "./otp/otp.service";
import { SocialLoginService } from "./social-login.service";
import { TokenService } from "./token.service";
import { QuestionnaireService, type StartQuestionnaireResult } from "./first-access/questionnaire.service";
import type { RequestOtpDto } from "./dto/request-otp.dto";
import type { VerifyOtpDto } from "./dto/verify-otp.dto";
import type { SocialLoginDto } from "./dto/social-login.dto";
import type { SubmitQuestionnaireDto } from "./dto/submit-questionnaire.dto";
import type { SelectCandidateDto } from "./dto/select-candidate.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly social: SocialLoginService,
    private readonly tokens: TokenService,
    private readonly questionnaire: QuestionnaireService,
    private readonly audit: AuditService,
  ) {}

  private async findOrCreateUserByContact(tenantId: string, contact: string, isEmail: boolean) {
    const existing = await this.prisma.platformUser.findFirst({
      where: { tenantId, ...(isEmail ? { email: contact } : { phone: contact }) },
    });
    if (existing) return existing;

    return this.prisma.platformUser.create({
      data: { tenantId, ...(isEmail ? { email: contact } : { phone: contact }) },
    });
  }

  private async issueLoginResult(
    userId: string,
    tenantId: string,
    contact: string,
    channel: "sms" | "whatsapp" | "email",
    ip?: string,
  ): Promise<LoginResult> {
    const user = await this.prisma.platformUser.findUniqueOrThrow({ where: { id: userId } });

    if (user.status === "BLOCKED") {
      throw new UnauthorizedException("Conta bloqueada. Procure o suporte do seu município.");
    }

    if (user.status === "PENDING_FIRST_ACCESS") {
      await this.audit.record({ tenantId, userId, action: "auth.first_access.required", ipAddress: ip });
      return {
        status: "first_access_required",
        firstAccessToken: await this.tokens.issueFirstAccessToken({ userId, tenantId, channel }),
      };
    }

    await this.audit.record({ tenantId, userId, action: "auth.login.success", ipAddress: ip });
    const { accessToken, refreshToken } = await this.tokens.issueSessionTokens({ userId, tenantId, ipAddress: ip });
    return { status: "authenticated", accessToken, refreshToken };
  }

  async requestOtp(tenantId: string, dto: RequestOtpDto): Promise<void> {
    const isEmail = dto.channel === "email";
    const user = await this.findOrCreateUserByContact(tenantId, dto.contact, isEmail);
    await this.otp.requestCode(dto.channel, dto.contact, user.id);
  }

  async verifyOtp(tenantId: string, dto: VerifyOtpDto, ip?: string): Promise<LoginResult> {
    const { userId } = await this.otp.verifyCode(dto.channel, dto.contact, dto.code);
    if (!userId) {
      // Não deveria acontecer (o código sempre é criado vinculado a um
      // usuário em requestOtp), mas nunca autentica sem userId resolvido.
      throw new UnauthorizedException("Código inválido ou expirado");
    }
    return this.issueLoginResult(userId, tenantId, dto.contact, dto.channel, ip);
  }

  async socialLogin(tenantId: string, dto: SocialLoginDto, ip?: string): Promise<LoginResult> {
    const identity = await this.social.verify(dto.provider, dto.idToken);

    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: { provider_providerUserId: { provider: dto.provider.toUpperCase() as never, providerUserId: identity.providerUserId } },
      include: { user: true },
    });

    if (existingIdentity) {
      return this.issueLoginResult(existingIdentity.userId, tenantId, identity.email ?? "", "email", ip);
    }

    if (!identity.email) {
      throw new UnauthorizedException("Não foi possível obter o e-mail da conta social");
    }

    const user = await this.findOrCreateUserByContact(tenantId, identity.email, true);
    await this.prisma.userIdentity.create({
      data: { userId: user.id, provider: dto.provider.toUpperCase() as never, providerUserId: identity.providerUserId },
    });

    return this.issueLoginResult(user.id, tenantId, identity.email, "email", ip);
  }

  async getQuestionnaire(firstAccessToken: string): Promise<StartQuestionnaireResult> {
    const payload = this.tokens.verifyFirstAccessToken(firstAccessToken);
    const user = await this.prisma.platformUser.findUniqueOrThrow({ where: { id: payload.sub } });
    const contact = user.email ?? user.phone;
    if (!contact) throw new UnauthorizedException("Usuário sem contato associado");
    return this.questionnaire.start(payload.sub, payload.tenantId, contact, payload.channel);
  }

  async selectQuestionnaireCandidate(firstAccessToken: string, dto: SelectCandidateDto) {
    const payload = this.tokens.verifyFirstAccessToken(firstAccessToken);
    return this.questionnaire.selectCandidate(payload.sub, dto.sourceSystem, dto.sourcePatientId, payload.channel);
  }

  async submitQuestionnaire(firstAccessToken: string, dto: SubmitQuestionnaireDto, ip?: string): Promise<LoginResult> {
    const payload = this.tokens.verifyFirstAccessToken(firstAccessToken);
    const { passed } = await this.questionnaire.submit(payload.sub, payload.tenantId, dto.attemptId, dto.answers);

    if (!passed) {
      await this.audit.record({ tenantId: payload.tenantId, userId: payload.sub, action: "auth.first_access.failed", ipAddress: ip });
      throw new UnauthorizedException("Não foi possível validar sua identidade. Procure o suporte do seu município.");
    }

    await this.audit.record({ tenantId: payload.tenantId, userId: payload.sub, action: "auth.first_access.passed", ipAddress: ip });
    const { accessToken, refreshToken } = await this.tokens.issueSessionTokens({
      userId: payload.sub,
      tenantId: payload.tenantId,
      ipAddress: ip,
    });
    return { status: "authenticated", accessToken, refreshToken };
  }

  async refresh(refreshToken: string, ip?: string) {
    return this.tokens.refresh(refreshToken, { ipAddress: ip });
  }

  async logout(userId: string): Promise<void> {
    await this.tokens.revokeAllSessions(userId);
  }

  /** Exigência das lojas: exclusão de conta acessível dentro do app. */
  async deleteAccount(userId: string, tenantId: string): Promise<void> {
    await this.tokens.revokeAllSessions(userId);
    await this.prisma.platformUser.update({
      where: { id: userId },
      data: { status: "BLOCKED", email: null, phone: null },
    });
    await this.audit.record({ tenantId, userId, action: "auth.account.deleted" });
  }
}
