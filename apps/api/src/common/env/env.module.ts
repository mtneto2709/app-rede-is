import { Global, Module } from "@nestjs/common";
import { loadEnv } from "@rede-is/config";

export const ENV = Symbol("ENV");

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
export class EnvModule {}
