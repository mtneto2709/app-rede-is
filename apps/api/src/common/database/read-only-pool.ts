import { Pool } from "pg";
import type { DatabaseConnectionConfig } from "@rede-is/config";

/**
 * Pool de conexão para uma base externa (Sistema IS / e-SUS PEC) que só
 * deve ser usada para leitura.
 *
 * Defesa em profundidade contra escrita acidental:
 *  1. O usuário de banco configurado em `.env` deve ter permissão apenas de
 *     `SELECT` no motor do banco (responsabilidade do DBA de cada base).
 *  2. Cada query roda dentro de uma sessão marcada como `READ ONLY` — a
 *     configuração da sessão é aplicada e aguardada *antes* da query real
 *     ser enviada no mesmo client (nunca via `pool.on("connect")`
 *     fire-and-forget, que corre em paralelo com a primeira query e dispara
 *     o aviso de depreciação do `pg` "client is already executing a
 *     query"). Qualquer tentativa de INSERT/UPDATE/DELETE nessa sessão
 *     falha no próprio Postgres.
 *  3. `scripts/check-read-only-integrations.mjs` barra, em CI, qualquer
 *     ocorrência de INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE dentro de
 *     `src/modules/integrations/**`.
 */
export class ReadOnlyPool {
  private readonly pool: Pool;
  private readonly schema: string | undefined;

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
    this.schema = config.schema && config.schema !== "public" ? config.schema : undefined;
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
      if (this.schema) {
        await client.query(`SET search_path TO ${JSON.stringify(this.schema)}`);
      }
      const result = await client.query(text, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
