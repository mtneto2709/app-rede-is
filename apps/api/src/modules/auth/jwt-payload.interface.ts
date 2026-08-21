export interface AccessTokenPayload {
  sub: string; // userId
  tenantId: string;
  type: "access";
}

export interface FirstAccessTokenPayload {
  sub: string; // userId pendente de vínculo
  tenantId: string;
  type: "first_access";
}
