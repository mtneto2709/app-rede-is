import { Pool, type PoolClient } from "pg";
import type { DatabaseConnectionConfig } from "@rede-is/config";

/**
 * Pool de conexão para uma base externa (Sistema IS / e-SUS PEC) que só
 * deve ser usada para leitura.
 *
 * Defesa em profundidade contra escrita acidental:
 *  1. O usuário de banco configurado em `.env` deve ter permissão apenas de
 *     `SELECT` no motor do banco (responsabilidade do DBA de cada base).
 *  2. Cada conexão desta pool roda `SET SESSION CHARACTERISTICS AS
 *     TRANSACTION READ ONLY` ao ser aberta — qualquer tentativa de
 *     INSERT/UPDATE/DELETE nessa sessão falha no próprio Postgres.
 *  3. `scripts/check-read-only-integrations.mjs` barra, em CI, qualquer
 *     ocorrência de INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE dentro de
 *     `src/modules/integrations/**`.
 */
export class ReadOnlyPool {
  private readonly pool: Pool;

  constructor(config: DatabaseConnectionConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
      max: 5,
    });

    this.pool.on("connect", (client: PoolClient) => {
      void client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
      if (config.schema && config.schema !== "public") {
        void client.query(`SET search_path TO ${JSON.stringify(config.schema)}`);
      }
    });
  }

  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]> {
    return this.pool.query(text, params).then((result) => result.rows as T[]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
