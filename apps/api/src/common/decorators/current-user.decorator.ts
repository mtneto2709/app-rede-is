import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface CurrentUserPayload {
  userId: string;
  tenantId: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
