import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";
import { SocialLoginService } from "./social-login.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { OtpService } from "./otp/otp.service";
import { SmsProvider } from "./otp/sms.provider";
import { WhatsappProvider } from "./otp/whatsapp.provider";
import { EmailProvider } from "./otp/email.provider";
import { QuestionnaireService } from "./first-access/questionnaire.service";
import { SistemaIsModule } from "../integrations/sistema-is/sistema-is.module";
import { EsusPecModule } from "../integrations/esus-pec/esus-pec.module";

@Module({
  imports: [PassportModule, JwtModule.register({}), SistemaIsModule, EsusPecModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SocialLoginService,
    JwtStrategy,
    OtpService,
    SmsProvider,
    WhatsappProvider,
    EmailProvider,
    QuestionnaireService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
