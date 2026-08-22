import { Module } from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { PatientsController } from "./patients.controller";
import { VaccinationService } from "./vaccination.service";
import { SistemaIsModule } from "../integrations/sistema-is/sistema-is.module";
import { EsusPecModule } from "../integrations/esus-pec/esus-pec.module";

@Module({
  imports: [SistemaIsModule, EsusPecModule],
  providers: [PatientsService, VaccinationService],
  controllers: [PatientsController],
})
export class PatientsModule {}
