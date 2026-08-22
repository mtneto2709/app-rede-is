import { Body, Controller, Delete, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { SocialLoginDto } from "./dto/social-login.dto";
import { SubmitQuestionnaireDto } from "./dto/submit-questionnaire.dto";
import { SelectCandidateDto } from "./dto/select-candidate.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, type CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import type { TenantRequest } from "../tenants/tenant.middleware";

// Limites mais restritos que o global (definido em app.module.ts) nos
// endpoints mais sensíveis a força bruta/enumeração.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post("otp/request")
  requestOtp(@Req() req: TenantRequest, @Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(req.tenantId, dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("otp/verify")
  verifyOtp(@Req() req: TenantRequest, @Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(req.tenantId, dto, req.ip);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("social/login")
  socialLogin(@Req() req: TenantRequest, @Body() dto: SocialLoginDto) {
    return this.auth.socialLogin(req.tenantId, dto, req.ip);
  }

  @Get("first-access/questionnaire")
  getQuestionnaire(@Headers("x-first-access-token") token: string) {
    return this.auth.getQuestionnaire(token);
  }

  /** Só é chamado quando /first-access/questionnaire retornou status "candidates". */
  @Throttle(AUTH_THROTTLE)
  @Post("first-access/candidate")
  selectCandidate(@Headers("x-first-access-token") token: string, @Body() dto: SelectCandidateDto) {
    return this.auth.selectQuestionnaireCandidate(token, dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("first-access/questionnaire")
  submitQuestionnaire(
    @Req() req: TenantRequest,
    @Headers("x-first-access-token") token: string,
    @Body() dto: SubmitQuestionnaireDto,
  ) {
    return this.auth.submitQuestionnaire(token, dto, req.ip);
  }

  @Post("refresh")
  refresh(@Req() req: TenantRequest, @Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.logout(user.userId);
  }

  /** Exigência das lojas (Apple/Google): exclusão de conta dentro do app. */
  @UseGuards(JwtAuthGuard)
  @Delete("me")
  deleteAccount(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.deleteAccount(user.userId, user.tenantId);
  }
}
