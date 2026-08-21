import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { GetQuestionnaireResult, SubmitQuestionnaireInput } from "@rede-is/shared-types";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SistemaIsRepository } from "../../integrations/sistema-is/sistema-is.repository";
import { EsusPecRepository } from "../../integrations/esus-pec/esus-pec.repository";

const QUESTIONS_PER_ATTEMPT = 3;
const MIN_CORRECT_TO_PASS = 3; // exige acerto de todas — reduz falso positivo
const MAX_ATTEMPTS_PER_USER = 3;

/**
 * Questionário de validação de identidade no primeiro acesso: perguntas
 * geradas a partir de dados que só o titular saberia (mãe, unidade de
 * referência, etc.), comparadas contra o registro encontrado no Sistema IS
 * ou no e-SUS PEC — nunca contra algo fornecido pelo próprio usuário no
 * cadastro (isso não provaria identidade).
 */
@Injectable()
export class QuestionnaireService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sistemaIs: SistemaIsRepository,
    private readonly esusPec: EsusPecRepository,
  ) {}

  /**
   * Localiza o paciente correspondente ao contato usado no login, em
   * qualquer uma das duas bases. Deve ser chamado antes de emitir o
   * questionário — se nenhuma base tiver o paciente, o acesso não pode ser
   * validado automaticamente (fluxo manual/suporte, fora de escopo aqui).
   */
  async findCandidatePatient(contact: string) {
    const [fromIs, fromEsus] = await Promise.all([
      this.sistemaIs.findPatientByContact(contact).catch(() => null),
      this.esusPec.findPatientByContact(contact).catch(() => null),
    ]);
    const patient = fromIs ?? fromEsus;
    if (!patient) return null;
    return patient;
  }

  async createAttempt(userId: string, tenantId: string, contact: string): Promise<GetQuestionnaireResult> {
    const attemptsCount = await this.prisma.questionnaireAttempt.count({ where: { userId } });
    if (attemptsCount >= MAX_ATTEMPTS_PER_USER) {
      throw new UnauthorizedException(
        "Número máximo de tentativas de validação excedido. Procure o suporte do seu município.",
      );
    }

    const patient = await this.findCandidatePatient(contact);
    if (!patient) {
      throw new BadRequestException(
        "Não localizamos seu cadastro nas bases de saúde. Procure o suporte do seu município.",
      );
    }

    const pool = await this.prisma.questionnaireQuestion.findMany({
      where: { tenantId, isActive: true },
    });
    if (pool.length < QUESTIONS_PER_ATTEMPT) {
      throw new Error("Banco de perguntas do tenant insuficiente para gerar o questionário");
    }

    const chosen = shuffle(pool).slice(0, QUESTIONS_PER_ATTEMPT);

    const questions = chosen.map((q) => {
      // TODO(db-mapping): resolver o valor correto a partir de `patient`
      // (ou de uma consulta adicional) conforme `q.answerSourceField`, e
      // gerar 2-3 opções incorretas plausíveis (distratores) a partir da
      // base de dados — nunca gerar distratores óbvios (ex.: "N/A").
      const correctOptionId = randomUUID();
      const options = shuffle([
        { id: correctOptionId, label: "TODO(db-mapping): resposta correta" },
        { id: randomUUID(), label: "TODO(db-mapping): distrator 1" },
        { id: randomUUID(), label: "TODO(db-mapping): distrator 2" },
      ]);

      return { question: q, correctOptionId, options };
    });

    const attempt = await this.prisma.questionnaireAttempt.create({
      data: {
        userId,
        questionIds: questions.map((q) => q.question.id),
        answerKey: Object.fromEntries(questions.map((q) => [q.question.id, q.correctOptionId])),
        sourceSystem: patient.sourceSystem,
        sourcePatientId: patient.id,
      },
    });

    return {
      attemptId: attempt.id,
      questions: questions.map((q) => ({
        id: q.question.id,
        prompt: q.question.prompt,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      })),
    };
  }

  async submit(userId: string, input: SubmitQuestionnaireInput): Promise<{ passed: boolean }> {
    const attempt = await this.prisma.questionnaireAttempt.findUnique({ where: { id: input.attemptId } });
    if (!attempt || attempt.userId !== userId) {
      throw new UnauthorizedException("Tentativa de validação inválida");
    }
    if (attempt.resolvedAt) {
      throw new BadRequestException("Esta tentativa já foi resolvida");
    }

    const answerKey = attempt.answerKey as Record<string, string>;
    const correctCount = input.answers.filter((a) => answerKey[a.questionId] === a.optionId).length;
    const passed = correctCount >= MIN_CORRECT_TO_PASS;

    await this.prisma.questionnaireAttempt.update({
      where: { id: attempt.id },
      data: { correctCount, passed, resolvedAt: new Date() },
    });

    if (passed && attempt.sourceSystem && attempt.sourcePatientId) {
      await this.prisma.patientLink.create({
        data: {
          userId,
          sourceSystem: attempt.sourceSystem,
          sourcePatientId: attempt.sourcePatientId,
        },
      });
      await this.prisma.platformUser.update({ where: { id: userId }, data: { status: "ACTIVE" } });
    }

    return { passed };
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
}
