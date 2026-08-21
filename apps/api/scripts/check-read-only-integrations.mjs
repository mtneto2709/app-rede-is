#!/usr/bin/env node
// Barra qualquer palavra-chave de escrita SQL dentro de
// src/modules/integrations/**. Executado em CI (ver SECURITY.md ->
// "Somente leitura") — as bases do Sistema IS e do e-SUS PEC nunca podem
// receber escrita desta aplicação.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const TARGET_DIR = join(import.meta.dirname, "..", "src", "modules", "integrations");
const FORBIDDEN = /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+(TABLE|SCHEMA|DATABASE)|ALTER\s+TABLE|TRUNCATE)\b/i;

function walk(dir) {
  const violations = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      violations.push(...walk(fullPath));
    } else if (entry.endsWith(".ts")) {
      const content = readFileSync(fullPath, "utf-8");
      if (FORBIDDEN.test(content)) {
        violations.push(fullPath);
      }
    }
  }
  return violations;
}

const violations = walk(TARGET_DIR);

if (violations.length > 0) {
  console.error("Encontradas possíveis operações de escrita em módulos de integração somente-leitura:");
  for (const file of violations) console.error(`  - ${file}`);
  console.error("\nSistema IS e e-SUS PEC são bases somente-leitura. Remova a operação de escrita.");
  process.exit(1);
}

console.log("OK: nenhuma operação de escrita encontrada em src/modules/integrations/**");
