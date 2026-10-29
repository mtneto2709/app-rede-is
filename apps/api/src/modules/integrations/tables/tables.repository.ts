import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { getTablesConnectionConfig, type Env } from "@rede-is/config";
import { ENV } from "../../../common/env/env.module";
import { ReadOnlyPool } from "../../../common/database/read-only-pool";
import { classifyAlertType, classifyAlertPriority } from "../../../common/utils/alert-classification";

/** Um alerta vindo de `mensagens.msg_alerta` — ainda sem `patientId`/`isRead`, que `PatientsService` preenche. */
export interface TableAlert {
  id: string;
  title: string;
  message: string;
  type: "medication" | "appointment" | "vaccine" | "exam" | "other";
  priority: "low" | "medium" | "high";
  createdAt: string;
}

/**
 * Repositório da base "Tables" — CONFIRMADO via DDL real que o cliente
 * passou. Diferente de Sistema IS/e-SUS PEC (uma base por cliente), essa é
 * uma base FIXA e ÚNICA, compartilhada por todas as instâncias/clientes da
 * aplicação (configurada em `TABLES_DB_*`).
 */
@Injectable()
export class TablesRepository implements OnModuleDestroy {
  private readonly logger = new Logger(TablesRepository.name);
  private readonly pool: ReadOnlyPool;

  constructor(@Inject(ENV) env: Env) {
    this.pool = new ReadOnlyPool(getTablesConnectionConfig(env));
  }

  /**
   * `mensagens.msg_alerta` (CONFIRMADO via DDL) + `mensagens.msg_tipoalerta`
   * (pro título/classificação do tipo). Busca por CPF; só cai pra CNS se o
   * paciente não tiver CPF cadastrado na base de origem — nunca os dois
   * juntos, como pedido pelo cliente. Compara só dígitos dos dois lados
   * (mesmo cuidado do fix de telefone/CPF com máscara nas outras buscas
   * desta base — `cpf`/`cns` são `char(N)` de largura fixa, mas não dá pra
   * garantir que sempre chegam sem máscara dos dois lados). `ativo = true`
   * filtra os desativados; ordena por `pkalerta` decrescente, como pedido.
   *
   * `registro` (data/hora de criação) e `prioridade` ('Baixa'/'Média'/
   * 'Alta') foram adicionadas depois — `classifyAlertPriority` mapeia pro
   * enum do app. `validade` continua como fallback de `createdAt` só pra
   * linhas antigas que ficaram com `registro` nulo (coluna adicionada
   * depois, sem backfill garantido).
   */
  async findAlertsByPatient(cpf: string | null, cns: string | null): Promise<TableAlert[]> {
    const cpfDigits = cpf?.replace(/\D/g, "") || null;
    const cnsDigits = cns?.replace(/\D/g, "") || null;

    const column = cpfDigits ? "cpf" : cnsDigits ? "cns" : null;
    const value = cpfDigits ?? cnsDigits;
    if (!column || !value) return [];

    try {
      const rows = await this.pool.query<{
        pkalerta: string;
        mensagem: string | null;
        validade: string | null;
        registro: string | null;
        prioridade: string | null;
        tipoalerta: string | null;
      }>(
        `SELECT a.pkalerta::text AS pkalerta, a.mensagem, a.validade, a.registro, a.prioridade, t.tipoalerta
         FROM mensagens.msg_alerta a
         LEFT JOIN mensagens.msg_tipoalerta t ON t.pktipoalerta = a.fktipoalerta
         WHERE a.ativo = true AND regexp_replace(coalesce(a.${column}, ''), '\\D', '', 'g') = $1
         ORDER BY a.pkalerta DESC`,
        [value],
      );

      return rows
        .filter((row): row is typeof row & { mensagem: string } => !!row.mensagem)
        .map((row) => ({
          id: `table-alert:${row.pkalerta}`,
          title: row.tipoalerta ?? "Alerta",
          // Quem cadastra a mensagem não tem como digitar uma quebra de
          // linha real pelos clientes de banco usados — digitam "\n"
          // literal (barra invertida + n). Convertemos pra quebra de linha
          // de verdade aqui; os apps (web/mobile) só precisam saber exibir
          // \n normalmente.
          message: row.mensagem.replace(/\\n/g, "\n"),
          type: classifyAlertType(row.tipoalerta),
          priority: classifyAlertPriority(row.prioridade),
          createdAt: row.registro
            ? new Date(row.registro).toISOString()
            : row.validade
              ? new Date(row.validade).toISOString()
              : new Date().toISOString(),
        }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao buscar alertas (mensagens.msg_alerta): ${message}`);
      return [];
    }
  }

  async onModuleDestroy() {
    await this.pool.close();
  }
}
