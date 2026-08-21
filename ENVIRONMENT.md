# Variáveis de ambiente

Todas as variáveis são validadas em `packages/config` (zod) na
inicialização do `apps/api` — a aplicação recusa subir se algo obrigatório
estiver ausente ou em formato inválido. Nenhum valor real deve ser
commitado; use `.env` local (git-ignorado) a partir do respectivo
`.env.example`.

## 1. Sistema IS (leitura)

```
SISTEMA_IS_DB_HOST=
SISTEMA_IS_DB_PORT=
SISTEMA_IS_DB_NAME=
SISTEMA_IS_DB_USER=          # usuário com permissão apenas de SELECT
SISTEMA_IS_DB_PASSWORD=
SISTEMA_IS_DB_SSL=true
SISTEMA_IS_DB_SCHEMA=        # se aplicável
```

## 2. e-SUS PEC (leitura)

```
ESUS_PEC_DB_HOST=
ESUS_PEC_DB_PORT=
ESUS_PEC_DB_NAME=
ESUS_PEC_DB_USER=            # usuário com permissão apenas de SELECT
ESUS_PEC_DB_PASSWORD=
ESUS_PEC_DB_SSL=true
ESUS_PEC_DB_SCHEMA=
```

## 3. Banco de controle (próprio, leitura e escrita)

Ao contrário das duas bases acima, esta é uma **URL única** — é o formato
que o Prisma CLI (`db push`/`migrate`/`db seed`) exige via
`env("CONTROL_DATABASE_URL")` no `prisma/schema.prisma`.

```
CONTROL_DATABASE_URL=postgresql://usuario:senha@host:5432/nome_do_banco
```

Exemplo local (Postgres rodando na própria máquina, sem senha/SSL):
`postgresql://redeis:redeis@localhost:5432/redeis_control`.
Se a senha tiver caracteres especiais (`@`, `:`, `/`, etc.), faça
[URL-encode](https://www.urlencoder.org/) só da senha antes de montar a
URL.

## 4. Autenticação

```
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_APPLE_CLIENT_ID=
OAUTH_APPLE_TEAM_ID=
OAUTH_APPLE_KEY_ID=
OAUTH_APPLE_PRIVATE_KEY=

SMS_PROVIDER=                # ex: twilio, zenvia, totalvoice
SMS_API_KEY=
SMS_API_SECRET=
WHATSAPP_PROVIDER=           # ex: meta-cloud-api, twilio
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
EMAIL_PROVIDER=              # ex: ses, sendgrid, resend
EMAIL_API_KEY=
EMAIL_FROM=

OTP_LENGTH=6
OTP_TTL_MINUTES=5
OTP_MAX_ATTEMPTS=5
```

## 5. Aplicação / infraestrutura

```
NODE_ENV=production
API_PORT=3000
API_BASE_URL=
WEB_BASE_URL=
CORS_ALLOWED_ORIGINS=        # lista separada por vírgula, por tenant/domínio
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60
SENTRY_DSN=                  # observabilidade/erro (opcional)
```

## 6. Mobile (build-time, por cliente)

Definidas em `clients/<slug>/.env` e injetadas no `app.config.ts` via
EAS Build (não em runtime — cada binário é fixo para um tenant):

```
EXPO_PUBLIC_TENANT_SLUG=
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_SENTRY_DSN=
```

---

> **Importante:** as credenciais reais do Sistema IS e do e-SUS PEC serão
> fornecidas fora do controle de versão (secret manager do ambiente de
> deploy, ou repassadas diretamente para configuração local). Nunca cole
> credenciais reais em mensagens de commit, PRs ou arquivos versionados.
