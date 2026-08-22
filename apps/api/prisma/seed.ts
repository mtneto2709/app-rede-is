import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed de desenvolvimento: cria o tenant "demo". As perguntas do
 * questionário de primeiro acesso não vêm mais do banco — são geradas em
 * código a partir dos dados reais do paciente (ver FIELD_OPTIONS em
 * src/modules/auth/first-access/questionnaire.service.ts).
 */
async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo" },
  });

  console.log(`Seed concluído para o tenant "${tenant.slug}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
