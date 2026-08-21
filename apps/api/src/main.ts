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

  await app.listen(env.API_PORT);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Falha ao inicializar a API:", error);
  process.exit(1);
});
