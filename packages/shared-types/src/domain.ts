import { z } from "zod";

/**
 * Tipos de domínio compartilhados entre apps/api, apps/web e apps/mobile.
 *
 * Os dados clínicos/cadastrais (Paciente, Atendimento, Agendamento, Unidade
 * de Saúde, Documento) são *sempre* originados do Sistema IS ou do e-SUS PEC
 * — nunca gravados no banco de controle. Os tipos aqui descrevem o formato
 * já normalizado que a API entrega para os apps, independentemente de qual
 * das duas bases forneceu o dado (ver `sourceSystem`).
 */

export const SourceSystem = z.enum(["sistema-is", "esus-pec"]);
export type SourceSystem = z.infer<typeof SourceSystem>;

export const Patient = z.object({
  id: z.string(),
  name: z.string(),
  cpf: z.string(),
  cns: z.string().nullable(), // Cartão Nacional de Saúde
  birthDate: z.string().nullable(),
  motherName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z
    .object({
      street: z.string().nullable(),
      number: z.string().nullable(),
      neighborhood: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      zipCode: z.string().nullable(),
    })
    .nullable(),
  referenceHealthUnitId: z.string().nullable(),
  sourceSystem: SourceSystem,
});
export type Patient = z.infer<typeof Patient>;

export const HealthCard = z.object({
  type: z.enum(["sus", "health-plan"]),
  number: z.string(),
  issuer: z.string().nullable(),
  holderName: z.string(),
  validUntil: z.string().nullable(),
});
export type HealthCard = z.infer<typeof HealthCard>;

export const Appointment = z.object({
  id: z.string(),
  patientId: z.string(),
  professionalName: z.string().nullable(),
  specialty: z.string().nullable(),
  scheduledAt: z.string(), // ISO 8601
  status: z.enum(["scheduled", "completed", "cancelled", "missed"]),
  type: z.enum(["consultation", "exam", "procedure", "vaccination"]),
  healthUnitId: z.string().nullable(),
  sourceSystem: SourceSystem,
});
export type Appointment = z.infer<typeof Appointment>;

/**
 * Categoria visual do atendimento (ícone + cor do card), derivada por
 * palavra-chave do `typeLabel` — mesma técnica dos outros classificadores
 * desta base (nenhuma das duas bases tem uma coluna fechada em enum pra
 * isso). Cada app mapeia a categoria pro próprio ícone (lucide no web,
 * Ionicons no mobile); a classificação em si mora só aqui pra não
 * duplicar a lista de palavras-chave em três lugares.
 */
export const AttendanceCategory = z.enum([
  "consultation",
  "procedure",
  "homeVisit",
  "prenatal",
  "vaccination",
  "dental",
  "childCare",
  "exam",
  "dressing",
  "group",
  "other",
]);
export type AttendanceCategory = z.infer<typeof AttendanceCategory>;

export const Attendance = z.object({
  id: z.string(),
  patientId: z.string(),
  professionalName: z.string().nullable(),
  specialty: z.string().nullable(),
  occurredAt: z.string(),
  diagnosis: z.string().nullable(),
  /** Código/descrição CIAP2 da avaliação, quando a base tiver essa classificação separada do CID-10 (ver `diagnosis`). */
  ciap2: z.string().nullable(),
  prescription: z.string().nullable(),
  healthUnitId: z.string().nullable(),
  /** Nome da unidade de saúde, já resolvido — evita o app ter que cruzar `healthUnitId` com a lista de unidades só pra mostrar isso no card. */
  healthUnitName: z.string().nullable(),
  /** Texto original do tipo de atendimento profissional na base de origem (ex. "Consulta programada / Cuidado continuado", "Visita Domiciliar"). `type`/`category` são versões reduzidas, isso aqui é o rótulo completo pra exibir em destaque. */
  typeLabel: z.string().nullable(),
  category: AttendanceCategory,
  type: z.enum(["consultation", "emergency", "routine"]),
  sourceSystem: SourceSystem,
});
export type Attendance = z.infer<typeof Attendance>;

export const HealthUnit = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["ubs", "hospital", "clinic", "laboratory", "other"]),
  // nullable: nem toda base tem endereço estruturado disponível — melhor
  // omitir na tela do que inventar um texto.
  address: z.string().nullable(),
  phone: z.string().nullable(),
  specialties: z.array(z.string()),
  openingHours: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  sourceSystem: SourceSystem,
});
export type HealthUnit = z.infer<typeof HealthUnit>;

/**
 * Uma dose da caderneta de vacinação — cruza o calendário vacinal (PNI,
 * fixo por idade) com o que o paciente de fato tomou. `dueDate` é o alvo
 * calculado a partir da data de nascimento; fica `null` quando já
 * administrada (nesse caso o que importa é `administeredAt`).
 */
export const VaccinationCardEntry = z.object({
  id: z.string(),
  immunobiologicName: z.string(),
  doseLabel: z.string(),
  status: z.enum(["administered", "late", "upcoming"]),
  dueDate: z.string().nullable(),
  administeredAt: z.string().nullable(),
  administeredAtHealthUnit: z.string().nullable(),
  administeredByProfessional: z.string().nullable(),
  sourceSystem: SourceSystem,
});
export type VaccinationCardEntry = z.infer<typeof VaccinationCardEntry>;

/**
 * `available: false` quando a base de origem do paciente não tem
 * mapeamento de vacinação ainda (hoje, só e-SUS PEC tem) — diferente de
 * "disponível mas sem nenhuma dose", que é `available: true` com array
 * vazio.
 */
export const VaccinationCardResponse = z.object({
  available: z.boolean(),
  entries: z.array(VaccinationCardEntry),
});
export type VaccinationCardResponse = z.infer<typeof VaccinationCardResponse>;

/**
 * Conteúdo estruturado de um documento clínico (e-SUS PEC não guarda PDF
 * pronto pra atestado/encaminhamento — o "Visualizar atestado" do sistema
 * é montado na hora a partir desses campos). O app monta uma visualização
 * equivalente com o que tiver disponível; campos ausentes simplesmente não
 * aparecem na tela.
 */
export const DocumentContent = z.object({
  healthUnitName: z.string().nullable(),
  professionalName: z.string().nullable(),
  professionalRole: z.string().nullable(),
  cid10: z.string().nullable(),
  /** Dias de afastamento (atestado) — null quando não se aplica ao tipo de documento. */
  daysOff: z.number().nullable(),
  /** Texto livre / itens do documento (lista de medicamentos da receita, motivo do encaminhamento etc). */
  text: z.string().nullable(),
});
export type DocumentContent = z.infer<typeof DocumentContent>;

export const Document = z.object({
  id: z.string(),
  patientId: z.string(),
  title: z.string(),
  type: z.enum(["prescription", "exam", "certificate", "referral", "report"]),
  issuedAt: z.string(),
  professionalName: z.string().nullable(),
  description: z.string().nullable(),
  /** URL de um arquivo já pronto (quando a base guardar um PDF/anexo) — a maioria dos documentos do e-SUS não tem isso, ver `content`. */
  fileUrl: z.string().nullable(),
  /** Campos estruturados pra montar uma visualização quando não há `fileUrl`. */
  content: DocumentContent.nullable(),
  sourceSystem: SourceSystem,
});
export type Document = z.infer<typeof Document>;

export const Alert = z.object({
  id: z.string(),
  patientId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(["medication", "appointment", "vaccine", "exam"]),
  priority: z.enum(["low", "medium", "high"]),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type Alert = z.infer<typeof Alert>;

export const DashboardStats = z.object({
  attendancesCount: z.number(),
  appointmentsCount: z.number(),
  alertsCount: z.number(),
  documentsCount: z.number(),
});
export type DashboardStats = z.infer<typeof DashboardStats>;

/**
 * Dados cadastrais do paciente logado — usado no cabeçalho (nome) e na
 * tela de perfil, e também pra sobrepor nos moldes de cartão virtual (ver
 * `TenantTheme.cards`). `name` sempre disponível (mesma fonte do
 * questionário de primeiro acesso); os demais campos vêm `null` quando a
 * base de origem não tiver o dado ou a coluna não estiver mapeada.
 */
export const PatientProfileSummary = z.object({
  name: z.string(),
  cns: z.string().nullable(),
  cpf: z.string().nullable(),
  birthDate: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});
export type PatientProfileSummary = z.infer<typeof PatientProfileSummary>;

/**
 * Uma comorbidade/condição de saúde estruturada do paciente (hipertensão,
 * diabetes etc). `source` é o texto original vindo da base, sem
 * normalização — quem exibe decide o rótulo.
 */
export const HealthCondition = z.object({
  id: z.string(),
  label: z.string(),
  /** Data de início do problema/condição, quando a base tiver essa data registrada. */
  startedAt: z.string().nullable(),
});
export type HealthCondition = z.infer<typeof HealthCondition>;

export const ContinuousMedication = z.object({
  id: z.string(),
  name: z.string(),
  dosage: z.string().nullable(),
});
export type ContinuousMedication = z.infer<typeof ContinuousMedication>;

export const ExamResult = z.object({
  id: z.string(),
  name: z.string(),
  requestedAt: z.string().nullable(),
  resultAt: z.string().nullable(),
  result: z.string().nullable(),
});
export type ExamResult = z.infer<typeof ExamResult>;

export const AllergyEntry = z.object({
  id: z.string(),
  label: z.string(),
});
export type AllergyEntry = z.infer<typeof AllergyEntry>;

/** Últimas medições/sinais vitais registrados num atendimento — `measuredAt` null quando nenhuma medição foi encontrada (o objeto todo vem `null` nesse caso, ver `HealthSummary.measurements`). */
export const VitalMeasurements = z.object({
  measuredAt: z.string().nullable(),
  weightKg: z.number().nullable(),
  heightCm: z.number().nullable(),
  bloodPressureSystolic: z.number().nullable(),
  bloodPressureDiastolic: z.number().nullable(),
  heartRate: z.number().nullable(),
  temperature: z.number().nullable(),
  oxygenSaturation: z.number().nullable(),
  capillaryGlucose: z.number().nullable(),
});
export type VitalMeasurements = z.infer<typeof VitalMeasurements>;

/**
 * `available: false` quando a base de origem do paciente ainda não tem
 * nada dessas informações mapeadas — cada lista/campo, individualmente,
 * pode vir vazio/null mesmo com `available: true` (significa "mapeado,
 * mas o paciente não tem nenhum registro"), diferente de "não mapeado
 * ainda".
 */
export const HealthSummary = z.object({
  available: z.boolean(),
  conditions: z.array(HealthCondition),
  medications: z.array(ContinuousMedication),
  exams: z.array(ExamResult),
  allergies: z.array(AllergyEntry),
  measurements: VitalMeasurements.nullable(),
});
export type HealthSummary = z.infer<typeof HealthSummary>;

// --- Entidades do banco de controle (próprio) ---

export const PlatformUser = z.object({
  id: z.string(),
  tenantId: z.string(),
  displayName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.enum(["pending_first_access", "active", "blocked"]),
  createdAt: z.string(),
});
export type PlatformUser = z.infer<typeof PlatformUser>;

export const TenantContact = z.object({
  id: z.string(),
  type: z.enum(["phone", "email", "whatsapp"]),
  value: z.string(),
  label: z.string(),
});
export type TenantContact = z.infer<typeof TenantContact>;

export const TenantSocialLink = z.object({
  id: z.string(),
  platform: z.enum(["facebook", "instagram", "twitter", "youtube", "linkedin"]),
  url: z.string().url(),
  label: z.string(),
});
export type TenantSocialLink = z.infer<typeof TenantSocialLink>;

export const TenantBanner = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().url().nullable(),
  order: z.number(),
});
export type TenantBanner = z.infer<typeof TenantBanner>;
