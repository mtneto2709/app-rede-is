import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    // Nunca expor detalhes de configuração/infra aqui — apenas liveness.
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
