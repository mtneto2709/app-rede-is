import { Controller, Get, Req } from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import type { TenantRequest } from "./tenant.middleware";

/** Endpoints públicos (sem autenticação) usados pela tela de login/branding. */
@Controller("tenants/current")
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get("theme")
  async getTheme(@Req() req: TenantRequest) {
    const theme = await this.tenants.getTheme(req.tenantSlug);
    // Nunca expor segredos/URLs internas do tenant aqui — apenas o
    // necessário para renderizar a tela de login com a marca certa.
    return {
      slug: theme.slug,
      displayName: theme.displayName,
      branding: theme.branding,
      colors: theme.colors,
      typography: theme.typography,
      auth: theme.auth,
      contactSupport: theme.contactSupport,
    };
  }

  @Get("social-links")
  async getSocialLinks(@Req() req: TenantRequest) {
    const theme = await this.tenants.getTheme(req.tenantSlug);
    return theme.socialLinks;
  }

  @Get("banners")
  async getBanners(@Req() req: TenantRequest) {
    const theme = await this.tenants.getTheme(req.tenantSlug);
    return [...theme.banners].sort((a, b) => a.order - b.order);
  }
}
