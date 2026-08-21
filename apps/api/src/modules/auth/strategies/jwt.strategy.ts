import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Env } from "@rede-is/config";
import { ENV } from "../../../common/env/env.module";
import type { AccessTokenPayload } from "../jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(@Inject(ENV) env: Env) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  // O retorno vira `req.user`. Validamos que o token é do tipo certo (não
  // aceitamos aqui um token de first-access como se fosse de sessão).
  validate(payload: AccessTokenPayload) {
    if (payload.type !== "access") {
      throw new Error("Tipo de token inválido para esta rota");
    }
    return { userId: payload.sub, tenantId: payload.tenantId };
  }
}
