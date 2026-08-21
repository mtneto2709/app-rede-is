import { z } from "zod";

/**
 * Configuração white-label de um tenant (cliente). Um arquivo
 * `clients/<slug>/theme.json` (validado contra este schema) é a única fonte
 * de verdade sobre a identidade visual e as políticas de um cliente — nada
 * disso deve ser hard-coded em `apps/web` ou `apps/mobile`.
 */
export const TenantTheme = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "use apenas minúsculas, números e hífen"),
  displayName: z.string(),
  legalName: z.string(),

  branding: z.object({
    appName: z.string(),
    logoLightUrl: z.string(),
    logoDarkUrl: z.string(),
    iconUrl: z.string(),
    faviconUrl: z.string(),
    splashUrl: z.string(),
  }),

  colors: z.object({
    primary: z.string(),
    primaryForeground: z.string(),
    secondary: z.string(),
    secondaryForeground: z.string(),
    background: z.string(),
    surface: z.string(),
    textPrimary: z.string(),
    textSecondary: z.string(),
    success: z.string(),
    warning: z.string(),
    danger: z.string(),
  }),

  typography: z
    .object({
      fontFamily: z.string().default("Inter"),
    })
    .default({ fontFamily: "Inter" }),

  mobile: z.object({
    iosBundleId: z.string(),
    androidPackage: z.string(),
    easProjectId: z.string().optional(),
  }),

  web: z.object({
    domains: z.array(z.string()), // domínios/subdomínios que resolvem para este tenant
  }),

  auth: z.object({
    socialProviders: z.array(z.enum(["google", "apple"])).default([]),
    otpChannels: z.array(z.enum(["sms", "whatsapp", "email"])).default(["sms", "email"]),
    requireFirstAccessQuestionnaire: z.boolean().default(true),
  }),

  contactSupport: z.object({
    phone: z.string().nullable(),
    whatsapp: z.string().nullable(),
    email: z.string().nullable(),
  }),

  socialLinks: z
    .array(
      z.object({
        platform: z.enum(["facebook", "instagram", "twitter", "youtube", "linkedin"]),
        url: z.string().url(),
        label: z.string(),
      }),
    )
    .default([]),

  banners: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        imageUrl: z.string().url().nullable(),
        order: z.number().default(0),
      }),
    )
    .default([]),
});
export type TenantTheme = z.infer<typeof TenantTheme>;
