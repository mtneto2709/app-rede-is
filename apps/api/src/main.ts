import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { loadEnv } from "@rede-is/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Falha rápido se alguma variável obrigatória estiver ausente/inválida —
  // nunca sobe com um default silencioso para segredo ou credencial de banco.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule, {
    // Nunca logar corpo de requisição/headers em produção (pode conter PII).
    logger: env.NODE_ENV === "production" ? ["error", "warn", "log"] : ["error", "warn", "log", "debug"],
  });

  app.use(helmet());
  app.enableCors({
    origin: env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos não declarados no DTO
      forbidNonWhitelisted: true, // rejeita payload com campo extra (evita mass assignment)
      transform: true,
    }),
  );

  app.setGlobalPrefix("api");

  // Log explícito do estado do bypass de dev no boot — evita depuração às
  // cegas quando NODE_ENV vem de fora (ex.: plataforma de deploy define
  // NODE_ENV=production automaticamente, mesmo com o .env local dizendo
  // development) e a variável acaba sendo ignorada silenciosamente.
  // eslint-disable-next-line no-console
  console.log(
    `[boot] NODE_ENV=${env.NODE_ENV} | AUTH_DEV_FORCE_OTP_PHONE=${
      env.NODE_ENV !== "production" && env.AUTH_DEV_FORCE_OTP_PHONE
        ? `ATIVO (${env.AUTH_DEV_FORCE_OTP_PHONE})`
        : "inativo"
    } | AUTH_DEV_ALWAYS_PASS_QUESTIONNAIRE=${
      env.NODE_ENV !== "production" && env.AUTH_DEV_ALWAYS_PASS_QUESTIONNAIRE ? "ATIVO" : "inativo"
    }`,
  );

  await app.listen(env.API_PORT);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Falha ao inicializar a API:", error);
  process.exit(1);
});
