import { IsIn, IsString, Length, MinLength } from "class-validator";

export class VerifyOtpDto {
  @IsIn(["sms", "whatsapp", "email"])
  channel!: "sms" | "whatsapp" | "email";

  @IsString()
  @MinLength(3)
  contact!: string;

  @IsString()
  @Length(4, 10)
  code!: string;
}
