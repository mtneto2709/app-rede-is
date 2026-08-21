import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { Env } from "@rede-is/config";
import { ENV } from "../env/env.module";

/**
 * Cliente Prisma do banco de controle (próprio). Nunca deve ser usado para
 * ler/escrever no Sistema IS ou no e-SUS PEC — para isso, ver
 * src/modules/integrations/**.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({ datasources: { db: { url: env.CONTROL_DATABASE_URL } } });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
