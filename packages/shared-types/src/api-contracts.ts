import { z } from "zod";

/**
 * Contratos de requisição/resposta entre apps/web + apps/mobile e apps/api.
 * Mantidos separados de `domain.ts` porque descrevem a forma da API, não o
 * modelo de dados em si.
 */

// --- Autenticação ---

export const AuthChannel = z.enum(["sms", "whatsapp", "email"]);
export type AuthChannel = z.infer<typeof AuthChannel>;

export const RequestOtpInput = z.object({
  channel: AuthChannel,
  contact: z.string().min(3), // telefone ou e-mail, conforme o canal
});
export type RequestOtpInput = z.infer<typeof RequestOtpInput>;

export const VerifyOtpInput = z.object({
  channel: AuthChannel,
  contact: z.string().min(3),
  code: z.string().length(6),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpInput>;

export const SocialProvider = z.enum(["google", "apple"]);
export type SocialProvider = z.infer<typeof SocialProvider>;

export const SocialLoginInput = z.object({
  provider: SocialProvider,
  idToken: z.string(),
});
export type SocialLoginInput = z.infer<typeof SocialLoginInput>;

// Resultado de um login (OTP ou social) antes da vinculação de paciente.
export const LoginResult = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("first_access_required"),
    firstAccessToken: z.string(), // token de curta duração p/ concluir o questionário
  }),
  z.object({
    status: z.literal("authenticated"),
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
]);
export type LoginResult = z.infer<typeof LoginResult>;

export const QuestionnaireQuestion = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })),
});
export type QuestionnaireQuestion = z.infer<typeof QuestionnaireQuestion>;

export const GetQuestionnaireResult = z.object({
  attemptId: z.string(),
  questions: z.array(QuestionnaireQuestion),
});
export type GetQuestionnaireResult = z.infer<typeof GetQuestionnaireResult>;

export const SubmitQuestionnaireInput = z.object({
  attemptId: z.string(),
  answers: z.array(z.object({ questionId: z.string(), optionId: z.string() })),
});
export type SubmitQuestionnaireInput = z.infer<typeof SubmitQuestionnaireInput>;

export const RefreshTokenInput = z.object({
  refreshToken: z.string(),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenInput>;

export const TokenPair = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type TokenPair = z.infer<typeof TokenPair>;
