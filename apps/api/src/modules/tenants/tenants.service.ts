import { Injectable, NotFoundException } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadTenantTheme, type TenantTheme } from "@rede-is/theme-tokens";
import { PrismaService } from "../../common/prisma/prisma.service";

// clients/<slug>/theme.json na raiz do monorepo.
const CLIENTS_DIR = join(__dirname, "..", "..", "..", "..", "..", "clients");

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTheme(slug: string): Promise<TenantTheme> {
    return loadTenantTheme(slug, async (s) => {
      try {
        const raw = await readFile(join(CLIENTS_DIR, s, "theme.json"), "utf-8");
        return JSON.parse(raw);
      } catch {
        throw new NotFoundException(`Cliente "${s}" não encontrado`);
      }
    });
  }

  /** Garante que existe uma linha `Tenant` no banco de controle para o slug. */
  async ensureTenantRecord(slug: string) {
    return this.prisma.tenant.upsert({
      where: { slug },
      update: {},
      create: { slug },
    });
  }

  async resolveSlugFromHost(host: string): Promise<string | null> {
    // ex.: demo.redeis.app -> "demo" | localhost -> "demo" (dev)
    if (host.includes("localhost") || host.startsWith("127.0.0.1")) {
      return "demo";
    }
    const [subdomain] = host.split(".");
    return subdomain ?? null;
  }
}
