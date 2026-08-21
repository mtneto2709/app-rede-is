import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntryInput {
  tenantId: string;
  userId?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Toda leitura sensível feita nas bases legadas (Sistema IS / e-SUS PEC)
 * deve passar por aqui. É a trilha usada tanto para investigar incidentes
 * de segurança quanto para prestar contas aos municípios sobre quem acessou
 * o quê.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntryInput): Promise<void> {
    await this.prisma.auditLogEntry.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        ipAddress: entry.ipAddress,
        metadata: entry.metadata as never,
      },
    });
  }
}
