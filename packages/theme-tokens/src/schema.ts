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
        // `.optional()` (chave ausente), não `.nullable()`: o app mobile
        // reidrata esse tema a partir de `Constants.expoConfig.extra` (o
        // manifesto do Expo Go passa pela ponte nativa), que não preserva
        // `null` de forma confiável — ele chega como `{}` do outro lado e
        // quebra o parse do zod. Chave ausente sobrevive normalmente.
        imageUrl: z.string().url().optional(),
        order: z.number().default(0),
      }),
    )
    .default([]),

  /**
   * Liga/desliga cada botão do app por cliente. Quando `false`, a tela e a
   * rota correspondente ficam indisponíveis (ver `notFound()` nas páginas
   * do web e a montagem condicional dos `Tab.Screen` no mobile) — não é só
   * um "esconder botão". `maisServicos` controla a própria tela de mais
   * serviços (Contato/Redes Sociais/links do cliente).
   */
  features: z
    .object({
      agendamentos: z.boolean().default(true),
      teleconsulta: z.boolean().default(true),
      atendimentos: z.boolean().default(true),
      vacinacao: z.boolean().default(true),
      cartoes: z.boolean().default(true),
      unidades: z.boolean().default(true),
      minhaSaude: z.boolean().default(true),
      maisServicos: z.boolean().default(true),
    })
    .default({}),

  /**
   * Cartões virtuais do paciente (SUS + cartões próprios do cliente, ex.
   * cartão do munícipe). As imagens são só o "molde" (frente/verso) — nome
   * e número do cartão do paciente são sobrepostos em tempo de execução
   * pelo app, nunca gravados na imagem. `showCns` liga a sobreposição do
   * número do CNS (só faz sentido pro cartão "sus"; cartões próprios do
   * cliente normalmente não têm esse dado).
   */
  cards: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        frontImageUrl: z.string(),
        // `.optional()` pelo mesmo motivo do `banners[].imageUrl` acima —
        // sobrevive à ponte nativa do Expo Go, `.nullable()` não.
        backImageUrl: z.string().optional(),
        showPatientName: z.boolean().default(true),
        showCns: z.boolean().default(false),
      }),
    )
    .default([]),

  /**
   * Links configuráveis pelo cliente na tela "Mais Serviços" — tanto pra
   * rotas internas do app quanto pra URLs externas (site da prefeitura,
   * ouvidoria, etc). `icon` é um conjunto fixo e pequeno pra funcionar nas
   * duas plataformas sem depender do nome exato de um ícone de uma lib
   * específica (lucide no web, Ionicons no mobile — cada um mapeia esses
   * valores pro próprio ícone).
   */
  customLinks: z
    .array(
      z.object({
        icon: z
          .enum(["link", "globe", "phone", "mail", "info", "megaphone", "building", "file-text", "heart", "star", "map-pin", "shield"])
          .default("link"),
        title: z.string(),
        subtitle: z.string().optional(),
        url: z.string(),
      }),
    )
    .default([]),
});
export type TenantTheme = z.infer<typeof TenantTheme>;
