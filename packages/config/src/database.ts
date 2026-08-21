import type { Env } from "./env";

export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  schema: string;
}

/** Configuração de conexão somente-leitura para o Sistema IS. */
export function getSistemaIsConnectionConfig(env: Env): DatabaseConnectionConfig {
  return {
    host: env.SISTEMA_IS_DB_HOST,
    port: env.SISTEMA_IS_DB_PORT,
    database: env.SISTEMA_IS_DB_NAME,
    user: env.SISTEMA_IS_DB_USER,
    password: env.SISTEMA_IS_DB_PASSWORD,
    ssl: env.SISTEMA_IS_DB_SSL,
    schema: env.SISTEMA_IS_DB_SCHEMA,
  };
}

/** Configuração de conexão somente-leitura para o e-SUS PEC. */
export function getEsusPecConnectionConfig(env: Env): DatabaseConnectionConfig {
  return {
    host: env.ESUS_PEC_DB_HOST,
    port: env.ESUS_PEC_DB_PORT,
    database: env.ESUS_PEC_DB_NAME,
    user: env.ESUS_PEC_DB_USER,
    password: env.ESUS_PEC_DB_PASSWORD,
    ssl: env.ESUS_PEC_DB_SSL,
    schema: env.ESUS_PEC_DB_SCHEMA,
  };
}

/** Configuração de conexão do banco de controle (próprio, leitura e escrita). */
export function getControlDbConnectionConfig(env: Env): DatabaseConnectionConfig {
  return {
    host: env.CONTROL_DB_HOST,
    port: env.CONTROL_DB_PORT,
    database: env.CONTROL_DB_NAME,
    user: env.CONTROL_DB_USER,
    password: env.CONTROL_DB_PASSWORD,
    ssl: env.CONTROL_DB_SSL,
    schema: "public",
  };
}
