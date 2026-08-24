import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cadastra um tenant no banco de controle (idempotente — upsert por slug).
 * Sem argumento, cria/atualiza o "demo" (uso de desenvolvimento). Pra um
 * cliente novo: `pnpm --filter @rede-is/api prisma:seed -- <slug>` (o
 * slug precisa bater com `clients/<slug>/theme.json`). As perguntas do
 * questionário de primeiro acesso não vêm do banco — são geradas em
 * código a partir dos dados reais do paciente (ver FIELD_OPTIONS em
 * src/modules/auth/first-access/questionnaire.service.ts).
 */
async function main() {
  const slug = process.argv[2] ?? "demo";
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: { slug },
  });

  console.log(`Seed concluído para o tenant "${tenant.slug}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
