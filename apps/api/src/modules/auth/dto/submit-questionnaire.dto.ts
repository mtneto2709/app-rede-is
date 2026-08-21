import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsString, ValidateNested } from "class-validator";

class AnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  optionId!: string;
}

export class SubmitQuestionnaireDto {
  @IsString()
  attemptId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
