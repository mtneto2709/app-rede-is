import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, type CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { PatientsService } from "./patients.service";
import type { TenantRequest } from "../tenants/tenant.middleware";

@UseGuards(JwtAuthGuard)
@Controller("me")
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get("dashboard")
  getDashboard(@CurrentUser() user: CurrentUserPayload, @Req() req: TenantRequest) {
    return this.patients.getDashboard(user.tenantId, user.userId, req.ip);
  }

  @Get("appointments")
  getAppointments(@CurrentUser() user: CurrentUserPayload, @Req() req: TenantRequest) {
    return this.patients.getAppointments(user.tenantId, user.userId, req.ip);
  }

  @Get("attendances")
  getAttendances(@CurrentUser() user: CurrentUserPayload, @Req() req: TenantRequest) {
    return this.patients.getAttendances(user.tenantId, user.userId, req.ip);
  }

  @Get("documents")
  getDocuments(@CurrentUser() user: CurrentUserPayload, @Req() req: TenantRequest) {
    return this.patients.getDocuments(user.tenantId, user.userId, req.ip);
  }

  @Get("alerts")
  getAlerts(@CurrentUser() user: CurrentUserPayload, @Req() req: TenantRequest) {
    return this.patients.getAlerts(user.tenantId, user.userId, req.ip);
  }

  @Get("health-units")
  getHealthUnits(@CurrentUser() user: CurrentUserPayload, @Req() req: TenantRequest) {
    return this.patients.getHealthUnits(user.tenantId, user.userId, req.ip);
  }
}
