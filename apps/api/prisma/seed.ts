import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed de desenvolvimento: cria o tenant "demo" e um banco de perguntas de
 * exemplo para o questionário de primeiro acesso. Os `answerSourceField`
 * abaixo são placeholders — ver TODO(db-mapping) em
 * src/modules/auth/first-access/questionnaire.service.ts.
 */
async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo" },
  });

  const questions = [
    { prompt: "Qual o nome da sua mãe?", answerSourceField: "motherName" },
    { prompt: "Qual é a sua unidade de saúde de referência?", answerSourceField: "referenceHealthUnit" },
    { prompt: "Em qual bairro você mora?", answerSourceField: "neighborhood" },
    { prompt: "Qual a sua data de nascimento?", answerSourceField: "birthDate" },
  ];

  for (const q of questions) {
    await prisma.questionnaireQuestion.upsert({
      where: { id: `${tenant.id}:${q.answerSourceField}` },
      update: {},
      create: { id: `${tenant.id}:${q.answerSourceField}`, tenantId: tenant.id, ...q },
    });
  }

  console.log(`Seed concluído para o tenant "${tenant.slug}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
