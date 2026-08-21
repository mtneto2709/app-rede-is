# Decisão de stack

## Escolha: React Native (Expo) + Next.js, monorepo TypeScript

- **Mobile:** [Expo](https://expo.dev) (React Native) com EAS Build/Submit.
- **Web:** Next.js (App Router), React.
- **Backend:** NestJS (Node.js/TypeScript).
- **Compartilhado:** um monorepo (pnpm workspaces + Turborepo) com pacotes de
  tipos de domínio, cliente de API e tokens de tema usados tanto pelo app
  quanto pelo portal.

## Por que essa combinação

- **Um único time, uma única linguagem (TypeScript)** do banco até a tela,
  em vez de manter Kotlin/Swift/Dart e JS/TS em paralelo.
- **Reuso real de código** entre portal e app: tipos de domínio, validações,
  cliente HTTP, regras de formatação (CPF, cartão SUS, datas) e a lógica de
  theming white-label vivem em `packages/` e são consumidos pelos dois apps.
- **White-label nativo por build**, via `EAS Build` com perfis por cliente
  (`eas.json` + `app.config.ts` dinâmico lendo `clients/<slug>/theme.json`):
  cada cliente gera um binário próprio (ícone, nome, bundle id, splash,
  cores) sem duplicar código-fonte.
- **OTA update** para JS/lógica de negócio via `expo-updates`, sem precisar
  de nova submissão em loja a cada ajuste (dentro dos limites das políticas
  da Apple/Google para conteúdo de update).
- **Comunidade e maturidade**: React Native é a stack cross-platform com
  maior adoção em produção hoje, com suporte de longo prazo e integração
  simples com bibliotecas de autenticação social, biometria, notificações
  push e SMS/WhatsApp.

## Alternativas consideradas

### Flutter
Também oferece um mecanismo de white-label maduro (`flavors` +
`--dart-define`). Foi descartado porque não compartilha nada com um portal
web em React — duplicaria tipos, regras de negócio e o sistema de temas em
duas linguagens (Dart e TypeScript), dobrando o custo de manutenção para um
time que também mantém o portal.

### Capacitor / Ionic (WebView nativo)
Permitiria reaproveitar 100% do portal web dentro de um app nativo. Foi
descartado por dois motivos práticos:
1. **Risco de rejeição/repro nas lojas.** A Apple historicamente escrutina
   (e pode rejeitar) apps que são essencialmente uma WebView fina —
   especialmente sensível em apps de saúde, onde a Guideline 4.2 ("Minimum
   Functionality") é aplicada com rigor.
2. **Experiência nativa inferior**: biometria, notificações push,
   compartilhamento de arquivos e acesso a câmera/documentos (necessários
   para carteirinhas e comprovantes) ficam mais limitados e menos fluidos
   que em React Native.

### Apps nativos separados (Swift/Kotlin)
Melhor performance/integração possível, mas custo de desenvolvimento e
manutenção dobrado (dois códigos completos) sem benefício adicional relevante
para o escopo do projeto (não há uso intensivo de recursos nativos de baixo
nível, câmera avançada, AR, etc.). Descartado por custo/benefício.

## Backend e bancos de dados

- **NestJS** (Node.js/TypeScript) por sua estrutura modular, DI, guards e
  interceptors prontos para os requisitos de segurança e multi-tenant do
  projeto (rate limiting, RBAC, auditoria, isolamento por tenant).
- **Duas conexões somente-leitura** para as bases externas: Sistema IS e
  e-SUS PEC (ver [`ENVIRONMENT.md`](./ENVIRONMENT.md)), acessadas por
  repositórios dedicados que **nunca** executam `INSERT/UPDATE/DELETE`.
- **Um banco de controle próprio** (PostgreSQL) para o que não pertence às
  bases legadas: tenants/white-label, usuários da plataforma, sessões,
  códigos OTP, banco de perguntas e respostas do questionário de primeiro
  acesso, e trilha de auditoria. Ver justificativa em
  [`ARCHITECTURE.md`](./ARCHITECTURE.md#banco-de-controle).
