import { Injectable, NestMiddleware, NotFoundException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { TenantsService } from "./tenants.service";

export interface TenantRequest extends Request {
  /** Slug do tenant (ex.: "demo") — usado para resolver branding/tema. */
  tenantSlug: string;
  /** id real do `Tenant` no banco de controle — usado em toda FK/consulta. */
  tenantId: string;
}

/**
 * Resolve o tenant de cada requisição:
 *  - App mobile: header `X-Tenant-Slug` (fixo por build, ver ARCHITECTURE.md)
 *  - Portal web: subdomínio do `Host`
 *
 * Toda rota autenticada usa `req.tenantId` (o id real no banco de
 * controle) para escopar dados — nunca confie em um tenantId vindo do
 * corpo da requisição. `req.tenantSlug` serve apenas para resolver
 * branding/tema white-label.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenants: TenantsService) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    const headerSlug = req.header("x-tenant-slug");
    const slug = headerSlug ?? (await this.tenants.resolveSlugFromHost(req.hostname));

    if (!slug) {
      throw new NotFoundException("Não foi possível identificar o cliente (tenant) da requisição");
    }

    // Lança NotFoundException se o tema não existir — falha cedo em vez de
    // deixar a requisição prosseguir sem branding/políticas definidas.
    await this.tenants.getTheme(slug);

    const tenant = await this.tenants.ensureTenantRecord(slug);

    req.tenantSlug = slug;
    req.tenantId = tenant.id;
    next();
  }
}
