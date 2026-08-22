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

export const Attendance = z.object({
  id: z.string(),
  patientId: z.string(),
  professionalName: z.string().nullable(),
  specialty: z.string().nullable(),
  occurredAt: z.string(),
  diagnosis: z.string().nullable(),
  prescription: z.string().nullable(),
  healthUnitId: z.string().nullable(),
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

export const Document = z.object({
  id: z.string(),
  patientId: z.string(),
  title: z.string(),
  type: z.enum(["prescription", "exam", "certificate", "report"]),
  issuedAt: z.string(),
  professionalName: z.string().nullable(),
  description: z.string().nullable(),
  fileUrl: z.string().nullable(),
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
