import { Module } from "@nestjs/common";
import { SistemaIsRepository } from "./sistema-is.repository";

@Module({
  providers: [SistemaIsRepository],
  exports: [SistemaIsRepository],
})
export class SistemaIsModule {}
