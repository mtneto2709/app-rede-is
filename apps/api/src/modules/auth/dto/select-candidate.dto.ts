import { IsIn, IsString } from "class-validator";

export class SelectCandidateDto {
  @IsIn(["sistema-is", "esus-pec"])
  sourceSystem!: "sistema-is" | "esus-pec";

  @IsString()
  sourcePatientId!: string;
}
