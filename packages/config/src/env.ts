import { z } from "zod";

/**
 * Schema único de variáveis de ambiente da API (apps/api).
 * Ver descrição de cada variável em /ENVIRONMENT.md na raiz do repo.
 *
 * A aplicação deve recusar subir (fail-fast) se algo obrigatório estiver
 * ausente ou mal formatado — nunca assumir um default silencioso para
 * segredo, credencial de banco ou URL de produção.
 */

const boolFromString = z
  .string()
  .transform((value) => value === "true")
  .pipe(z.boolean());

export const envSchema = z
  .object({
    // Sistema IS (somente leitura)
    SISTEMA_IS_DB_HOST: z.string().min(1),
    SISTEMA_IS_DB_PORT: z.coerce.number().int().positive(),
    SISTEMA_IS_DB_NAME: z.string().min(1),
    SISTEMA_IS_DB_USER: z.string().min(1),
    SISTEMA_IS_DB_PASSWORD: z.string().min(1),
    SISTEMA_IS_DB_SSL: boolFromString.default("true"),
    SISTEMA_IS_DB_SCHEMA: z.string().default("public"),

    // e-SUS PEC (somente leitura)
    ESUS_PEC_DB_HOST: z.string().min(1),
    ESUS_PEC_DB_PORT: z.coerce.number().int().positive(),
    ESUS_PEC_DB_NAME: z.string().min(1),
    ESUS_PEC_DB_USER: z.string().min(1),
    ESUS_PEC_DB_PASSWORD: z.string().min(1),
    ESUS_PEC_DB_SSL: boolFromString.default("true"),
    ESUS_PEC_DB_SCHEMA: z.string().default("public"),

    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3000),
    API_BASE_URL: z.string().url(),
    WEB_BASE_URL: z.string().url(),
    CORS_ALLOWED_ORIGINS: z.string().min(1),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

    // Banco de controle (próprio, leitura e escrita). URL única — é o
    // formato que o Prisma CLI (db push/migrate/seed) exige via
    // `env("CONTROL_DATABASE_URL")` no schema.prisma, então não a
    // decompomos em host/porta/etc. como as bases somente-leitura.
    CONTROL_DATABASE_URL: z.string().min(1),

    // Autenticação
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_TTL: z.string().default("30d"),

    OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
    OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
    OAUTH_APPLE_CLIENT_ID: z.string().optional(),
    OAUTH_APPLE_TEAM_ID: z.string().optional(),
    OAUTH_APPLE_KEY_ID: z.string().optional(),
    OAUTH_APPLE_PRIVATE_KEY: z.string().optional(),

    SMS_PROVIDER: z.string().optional(),
    SMS_API_KEY: z.string().optional(),
    SMS_API_SECRET: z.string().optional(),
    WHATSAPP_PROVIDER: z.string().optional(),
    WHATSAPP_API_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_TEMPLATE_NAME: z.string().optional(),
    WHATSAPP_TEMPLATE_LANGUAGE: z.string().optional(),
    EMAIL_PROVIDER: z.string().optional(),
    EMAIL_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),

    OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
    OTP_TTL_MINUTES: z.coerce.number().int().positive().default(5),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

    SENTRY_DSN: z.string().optional(),
  });

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Carrega e valida `process.env`. Lança na primeira violação, com todas as
 * variáveis inválidas listadas de uma vez (fail-fast e diagnosticável).
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas ou ausentes:\n${issues}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
