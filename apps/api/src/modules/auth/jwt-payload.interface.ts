export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  type: "access";
}

export interface FirstAccessTokenPayload {
  sub: string; // userId pendente de vínculo
  tenantId: string;
  type: "first_access";
  /** Canal usado no login — decide se a pergunta de celular ou de e-mail entra no questionário. */
  channel: "sms" | "whatsapp" | "email";
}
