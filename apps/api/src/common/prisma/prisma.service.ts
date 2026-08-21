import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { getControlDbConnectionConfig, type Env } from "@rede-is/config";
import { ENV } from "../env/env.module";

function buildConnectionUrl(env: Env): string {
  const c = getControlDbConnectionConfig(env);
  const sslParam = c.ssl ? "?sslmode=require" : "";
  return `postgresql://${encodeURIComponent(c.user)}:${encodeURIComponent(c.password)}@${c.host}:${c.port}/${c.database}${sslParam}`;
}

/**
 * Cliente Prisma do banco de controle (próprio). Nunca deve ser usado para
 * ler/escrever no Sistema IS ou no e-SUS PEC — para isso, ver
 * src/modules/integrations/**.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({ datasources: { db: { url: buildConnectionUrl(env) } } });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
