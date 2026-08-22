import { randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { Env } from "@rede-is/config";
import type { AuthChannel } from "@rede-is/shared-types";
import { ENV } from "../../../common/env/env.module";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SistemaIsRepository } from "../../integrations/sistema-is/sistema-is.repository";
import { EsusPecRepository } from "../../integrations/esus-pec/esus-pec.repository";
import type { IdentityProfile } from "../../../common/database/patient-source-repository.interface";
import { maskCpf, maskName } from "../../../common/utils/masking";

const QUESTIONS_PER_ATTEMPT = 5;
const MIN_QUESTIONS_TO_START = 3; // se a base não tiver dados suficientes, não dá pra montar um questionário confiável
const MIN_CORRECT_TO_PASS_RATIO = 0.8; // 4 de 5, ou todas se tiver menos de 5 disponíveis
const MAX_ATTEMPTS_PER_USER = 3;

type SourceSystem = "sistema-is" | "esus-pec";

export interface IdentityCandidateDto {
  sourceSystem: SourceSystem;
  sourcePatientId: string;
  maskedName: string;
}

export interface QuestionnaireReadyResult {
  attemptId: string;
  questions: { id: string; prompt: string; options: { id: string; label: string }[] }[];
}

export type StartQuestionnaireResult =
  | { status: "candidates"; candidates: IdentityCandidateDto[] }
  | ({ status: "ready" } & QuestionnaireReadyResult);

// Distratores sintéticos — não usam dados de outros pacientes para evitar
// qualquer vazamento de PII de terceiros nas opções erradas.
const NAME_DISTRACTORS = [
  "Maria",
  "José",
  "Ana",
  "João",
  "Francisca",
  "Antônio",
  "Raimunda",
  "Francisco",
  "Marta",
  "Pedro",
];
const CITY_DISTRACTORS = ["Fortaleza", "Sobral", "Juazeiro do Norte", "Maracanaú", "Caucaia", "Quixadá"];
const STREET_DISTRACTORS = ["Rua das Flores", "Rua da Paz", "Avenida Brasil", "Rua São José", "Travessa Central"];
const NEIGHBORHOOD_DISTRACTORS = ["Centro", "Vila Nova", "Jardim América", "Bela Vista", "São José"];

interface FieldOption {
  key: string;
  prompt: string;
  buildCorrect: (profile: IdentityProfile) => string | null;
  buildDistractors: (correct: string) => string[];
  /** Só entra no sorteio se a função retornar true (ex.: depende do canal de login). */
  isAvailable?: (channel: AuthChannel) => boolean;
}

function pickRandom<T>(items: T[], count: number, exclude: T[] = []): T[] {
  const pool = items.filter((i) => !exclude.includes(i));
  const shuffled = shuffle(pool);
  return shuffled.slice(0, count);
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

function computeAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasNotHadBirthdayThisYear =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (hasNotHadBirthdayThisYear) age -= 1;
  return age;
}

function middleNameOf(fullName: string): string | null {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 3) return null; // sem nome do meio de fato
  return parts.slice(1, -1).join(" ");
}

function firstNameOf(fullName: string): string | null {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? null;
}

const FIELD_OPTIONS: FieldOption[] = [
  {
    key: "motherMiddleName",
    prompt: "Qual é o nome do meio da sua mãe?",
    buildCorrect: (p) => (p.motherName ? middleNameOf(p.motherName) : null),
    buildDistractors: (correct) => pickRandom(NAME_DISTRACTORS, 4, [correct]),
  },
  {
    key: "fatherFirstName",
    prompt: "Qual é o primeiro nome do seu pai?",
    buildCorrect: (p) => (p.fatherName ? firstNameOf(p.fatherName) : null),
    buildDistractors: (correct) => pickRandom(NAME_DISTRACTORS, 4, [correct]),
  },
  {
    key: "age",
    prompt: "Qual é a sua idade?",
    buildCorrect: (p) => (p.birthDate ? String(computeAge(p.birthDate)) : null),
    buildDistractors: (correct) => {
      const real = Number(correct);
      const offsets = shuffle([-7, -4, -2, 2, 4, 7, 10]).slice(0, 6);
      const values = new Set<string>();
      for (const offset of offsets) {
        const candidate = real + offset;
        if (candidate > 0 && candidate < 120) values.add(String(candidate));
        if (values.size === 4) break;
      }
      return [...values];
    },
  },
  {
    key: "birthCity",
    prompt: "Em qual cidade você nasceu?",
    buildCorrect: (p) => p.birthCity,
    buildDistractors: (correct) => pickRandom(CITY_DISTRACTORS, 4, [correct]),
  },
  {
    key: "cpf",
    prompt: "Qual desses é o seu CPF?",
    buildCorrect: (p) => (p.cpf ? maskCpf(p.cpf) : null),
    buildDistractors: () =>
      Array.from({ length: 4 }, () => maskCpf(String(Math.floor(Math.random() * 100_000_000_000)).padStart(11, "0"))),
  },
  {
    key: "street",
    prompt: "Em qual dessas ruas você mora ou já morou?",
    buildCorrect: (p) => p.streets[0] ?? null,
    buildDistractors: (correct) => pickRandom(STREET_DISTRACTORS, 4, [correct]),
  },
  {
    key: "neighborhood",
    prompt: "Em qual desses bairros você mora ou já morou?",
    buildCorrect: (p) => p.neighborhoods[0] ?? null,
    buildDistractors: (correct) => pickRandom(NEIGHBORHOOD_DISTRACTORS, 4, [correct]),
  },
  {
    key: "mobilePhone",
    prompt: "Qual desses é o seu celular?",
    buildCorrect: (p) => (p.mobilePhones[0] ? formatPhoneOption(p.mobilePhones[0]) : null),
    buildDistractors: (correct) => Array.from({ length: 4 }, () => randomPhoneLike(correct)),
    isAvailable: (channel) => channel === "email",
  },
  {
    key: "email",
    prompt: "Qual desses é o seu e-mail?",
    buildCorrect: (p) => p.emails[0] ?? null,
    buildDistractors: (correct) => Array.from({ length: 4 }, () => randomEmailLike(correct)),
    isAvailable: (channel) => channel === "sms" || channel === "whatsapp",
  },
];

function formatPhoneOption(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
function randomPhoneLike(exclude: string): string {
  let value: string;
  do {
    const ddd = 80 + Math.floor(Math.random() * 10);
    const rest = Math.floor(90000_0000 + Math.random() * 9999_9999).toString();
    value = `(${ddd}) 9${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  } while (value === exclude);
  return value;
}
function randomEmailLike(exclude: string): string {
  const domains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br"];
  let value: string;
  do {
    const user = Math.random().toString(36).slice(2, 8);
    value = `${user}@${domains[Math.floor(Math.random() * domains.length)]}`;
  } while (value === exclude);
  return value;
}

/**
 * Questionário de validação de identidade no primeiro acesso: perguntas
 * geradas a partir de dados que só o titular saberia, comparadas contra o
 * registro encontrado no e-SUS PEC (prioridade) ou no Sistema IS — nunca
 * contra algo fornecido pelo próprio usuário no cadastro.
 */
@Injectable()
export class QuestionnaireService {
  private readonly logger = new Logger(QuestionnaireService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sistemaIs: SistemaIsRepository,
    private readonly esusPec: EsusPecRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Todos os cadastros (em qualquer uma das duas bases) cujo contato bate com o informado no login. */
  private async findCandidates(contact: string): Promise<IdentityCandidateDto[]> {
    const [fromEsus, fromIs] = await Promise.all([
      this.esusPec.findIdentityCandidatesByContact(contact).catch(() => []),
      this.sistemaIs.findIdentityCandidatesByContact(contact).catch(() => []),
    ]);

    // e-SUS primeiro — é a base priorizada quando a mesma pessoa aparecer em ambas.
    return [
      ...fromEsus.map((c) => ({ sourceSystem: "esus-pec" as const, sourcePatientId: c.sourcePatientId, maskedName: maskName(c.name) })),
      ...fromIs.map((c) => ({ sourceSystem: "sistema-is" as const, sourcePatientId: c.sourcePatientId, maskedName: maskName(c.name) })),
    ];
  }

  private repositoryFor(sourceSystem: SourceSystem) {
    return sourceSystem === "esus-pec" ? this.esusPec : this.sistemaIs;
  }

  private buildQuestionsFromProfile(profile: IdentityProfile, channel: AuthChannel) {
    const usable = FIELD_OPTIONS.filter((field) => {
      if (field.isAvailable && !field.isAvailable(channel)) return false;
      return field.buildCorrect(profile) !== null;
    });

    if (usable.length < MIN_QUESTIONS_TO_START) {
      throw new BadRequestException(
        "Não há dados suficientes no seu cadastro para gerar o questionário de validação. Procure o suporte do seu município.",
      );
    }

    const chosen = shuffle(usable).slice(0, QUESTIONS_PER_ATTEMPT);

    return chosen.map((field) => {
      const correct = field.buildCorrect(profile)!;
      const correctOptionId = randomUUID();
      const options = shuffle([
        { id: correctOptionId, label: correct },
        ...field.buildDistractors(correct).map((label) => ({ id: randomUUID(), label })),
      ]);
      return { field: field.key, prompt: field.prompt, correctOptionId, options };
    });
  }

  /** Primeiro passo: acha o(s) cadastro(s) e monta o questionário direto se houver só um. */
  async start(userId: string, tenantId: string, contact: string, channel: AuthChannel): Promise<StartQuestionnaireResult> {
    const attemptsCount = await this.prisma.questionnaireAttempt.count({ where: { userId } });
    if (attemptsCount >= MAX_ATTEMPTS_PER_USER) {
      throw new UnauthorizedException(
        "Número máximo de tentativas de validação excedido. Procure o suporte do seu município.",
      );
    }

    const candidates = await this.findCandidates(contact);
    if (candidates.length === 0) {
      throw new BadRequestException(
        "Não localizamos seu cadastro nas bases de saúde. Procure o suporte do seu município.",
      );
    }

    if (candidates.length > 1) {
      return { status: "candidates", candidates };
    }

    const only = candidates[0]!;
    const attempt = await this.createAttempt(userId, only.sourceSystem, only.sourcePatientId, channel);
    return { status: "ready", ...attempt };
  }

  /** Segundo passo (só quando houve desambiguação): monta o questionário para o candidato escolhido. */
  async selectCandidate(
    userId: string,
    sourceSystem: SourceSystem,
    sourcePatientId: string,
    channel: AuthChannel,
  ): Promise<QuestionnaireReadyResult> {
    return this.createAttempt(userId, sourceSystem, sourcePatientId, channel);
  }

  private async createAttempt(
    userId: string,
    sourceSystem: SourceSystem,
    sourcePatientId: string,
    channel: AuthChannel,
  ): Promise<QuestionnaireReadyResult> {
    const profile = await this.repositoryFor(sourceSystem).getIdentityProfile(sourcePatientId);
    if (!profile) {
      throw new BadRequestException("Não foi possível carregar os dados do cadastro selecionado.");
    }

    const built = this.buildQuestionsFromProfile(profile, channel);

    const attempt = await this.prisma.questionnaireAttempt.create({
      data: {
        userId,
        questionIds: built.map((q) => q.field),
        answerKey: Object.fromEntries(built.map((q) => [q.field, q.correctOptionId])),
        sourceSystem,
        sourcePatientId,
      },
    });

    return {
      attemptId: attempt.id,
      questions: built.map((q) => ({
        id: q.field,
        prompt: q.prompt,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
      })),
    };
  }

  async submit(userId: string, attemptId: string, answers: { questionId: string; optionId: string }[]): Promise<{ passed: boolean }> {
    const attempt = await this.prisma.questionnaireAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) {
      throw new UnauthorizedException("Tentativa de validação inválida");
    }
    if (attempt.resolvedAt) {
      throw new BadRequestException("Esta tentativa já foi resolvida");
    }

    const answerKey = attempt.answerKey as Record<string, string>;
    const correctCount = answers.filter((a) => answerKey[a.questionId] === a.optionId).length;
    const total = Object.keys(answerKey).length;
    let passed = correctCount >= Math.ceil(total * MIN_CORRECT_TO_PASS_RATIO);

    const devBypass = this.env.NODE_ENV !== "production" && this.env.AUTH_DEV_ALWAYS_PASS_QUESTIONNAIRE;
    if (devBypass && !passed) {
      this.logger.warn(
        `[DEV] AUTH_DEV_ALWAYS_PASS_QUESTIONNAIRE ativo — aprovando tentativa ${attemptId} apesar de ${correctCount}/${total} respostas corretas.`,
      );
      passed = true;
    }

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
