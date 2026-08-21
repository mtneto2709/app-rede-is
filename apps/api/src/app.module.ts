import { MiddlewareConsumer, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { loadEnv } from "@rede-is/config";
import { EnvModule } from "./common/env/env.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuditModule } from "./common/audit/audit.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { TenantMiddleware } from "./modules/tenants/tenant.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { HealthController } from "./health.controller";

const env = loadEnv();

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    AuditModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: env.RATE_LIMIT_WINDOW_MS, limit: env.RATE_LIMIT_MAX }],
    }),
    TenantsModule,
    AuthModule,
    PatientsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).exclude("health").forRoutes("*");
  }
}
