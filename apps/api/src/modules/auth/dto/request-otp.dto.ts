import { IsIn, IsString, MinLength } from "class-validator";

export class RequestOtpDto {
  @IsIn(["sms", "whatsapp", "email"])
  channel!: "sms" | "whatsapp" | "email";

  @IsString()
  @MinLength(3)
  contact!: string;
}
