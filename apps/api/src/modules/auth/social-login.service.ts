import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
import type { Env } from "@rede-is/config";
import type { SocialProvider } from "@rede-is/shared-types";
import { ENV } from "../../common/env/env.module";

export interface SocialIdentity {
  provider: SocialProvider;
  providerUserId: string;
  email?: string;
}

@Injectable()
export class SocialLoginService {
  private readonly googleClient: OAuth2Client;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.googleClient = new OAuth2Client(env.OAUTH_GOOGLE_CLIENT_ID);
  }

  async verify(provider: SocialProvider, idToken: string): Promise<SocialIdentity> {
    if (provider === "google") {
      return this.verifyGoogle(idToken);
    }
    return this.verifyApple(idToken);
  }

  private async verifyGoogle(idToken: string): Promise<SocialIdentity> {
    if (!this.env.OAUTH_GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException("Login com Google não habilitado para este cliente");
    }

    const ticket = await this.googleClient
      .verifyIdToken({ idToken, audience: this.env.OAUTH_GOOGLE_CLIENT_ID })
      .catch(() => null);

    const payload = ticket?.getPayload();
    if (!payload?.sub) {
      throw new UnauthorizedException("Token do Google inválido");
    }

    return { provider: "google", providerUserId: payload.sub, email: payload.email };
  }

  private async verifyApple(_idToken: string): Promise<SocialIdentity> {
    if (!this.env.OAUTH_APPLE_CLIENT_ID) {
      throw new UnauthorizedException("Login com Apple não habilitado para este cliente");
    }

    // TODO(integração real): validar o JWT do Sign in with Apple contra as
    // chaves públicas da Apple (https://appleid.apple.com/auth/keys),
    // verificando `aud` == OAUTH_APPLE_CLIENT_ID e `iss` ==
    // "https://appleid.apple.com". Bibliotecas como `apple-signin-auth`
    // encapsulam esse fluxo.
    throw new UnauthorizedException("Verificação de Sign in with Apple ainda não implementada");
  }
}
