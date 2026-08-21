import { Module } from "@nestjs/common";
import { EsusPecRepository } from "./esus-pec.repository";

@Module({
  providers: [EsusPecRepository],
  exports: [EsusPecRepository],
})
export class EsusPecModule {}
