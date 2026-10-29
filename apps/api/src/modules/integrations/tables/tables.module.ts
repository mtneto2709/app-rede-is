import { Module } from "@nestjs/common";
import { TablesRepository } from "./tables.repository";

@Module({
  providers: [TablesRepository],
  exports: [TablesRepository],
})
export class TablesModule {}
