# Arquitetura

## Visão geral

```
                        ┌─────────────────────┐
                        │   clients/<slug>     │  tema, logos, bundle id
                        │   (config white-label)│  por cliente
                        └──────────┬───────────┘
                                   │ build-time
              ┌────────────────────┼────────────────────┐
              ▼                                          ▼
     ┌─────────────────┐                        ┌─────────────────┐
     │  apps/web        │                        │  apps/mobile     │
     │  (Next.js)        │                        │  (Expo/RN)       │
     │  portal do cidadão│                        │  App Store/      │
     └────────┬──────────┘                        │  Play Store      │
              │  HTTPS/JSON (JWT)                  └────────┬─────────┘
              │                                              │
              └───────────────────┬──────────────────────────┘
                                   ▼
                         ┌───────────────────┐
                         │   apps/api          │  NestJS
                         │   (backend único)   │
                         └─────────┬───────────┘
              ┌─────────────────────┼─────────────────────────┐
              ▼                     ▼                          ▼
   ┌────────────────────┐ ┌──────────────────────┐  ┌───────────────────────┐
   │ Banco de controle    │ │ Sistema IS (leitura)  │  │ e-SUS PEC (leitura)   │
   │ (PostgreSQL próprio) │ │ read-only role         │  │ read-only role         │
   │ tenants, users,       │ │ SISTEMA_IS_DATABASE_URL│  │ ESUS_PEC_DATABASE_URL │
   │ otp_codes,             │ └──────────────────────┘  └───────────────────────┘
   │ questionnaire_*,       │
   │ audit_log              │
   └────────────────────┘
```

## Multi-tenant / white-label

Cada cliente (município, operadora) é um **tenant**. Um tenant é identificado
em tempo de execução por:

- **Web:** subdomínio ou domínio próprio (`prefeituraX.redeis.app` ou
  `portal.saude.prefeiturax.gov.br`), resolvido em middleware do Next.js que
  injeta o `tenantId` em toda a requisição.
- **Mobile:** o `tenantId` é fixo por build (definido em
  `clients/<slug>/theme.json` e embutido via `app.config.ts` no momento do
  `eas build`) — cada cliente tem seu próprio binário, então não há seleção
  de tenant em runtime dentro do app.

Toda consulta ao backend carrega o `tenantId` (via subdomínio, header
assinado no app, ou claim no JWT após login) e o `apps/api` aplica esse
`tenantId`:
1. Para resolver **tema/branding** e políticas do tenant (ex.: quais métodos
   de OTP estão habilitados).
2. Para **filtrar dados** nas bases legadas quando a base for compartilhada
   entre municípios (ex.: `WHERE municipio_id = :tenantId` — a coluna real
   será mapeada por cliente, ver `TODO(db-mapping)` nos repositórios).
3. Para **auditoria**: todo acesso é logado com `tenantId + userId +
   recurso + timestamp`.

Nenhuma regra de negócio de cliente específico deve ser hard-coded no
código-fonte — tudo o que varia por cliente vive em configuração
(`clients/<slug>/`) ou na tabela `tenants` do banco de controle.

## Fluxo de autenticação

1. **Login social** (Google/Apple/Microsoft, conforme o tenant habilitar) ou
   **código de acesso** enviado por SMS, WhatsApp ou e-mail.
2. **Primeiro acesso**: além do login, o usuário responde um **questionário
   de validação de identidade** com perguntas geradas aleatoriamente a
   partir de dados que só o titular saberia (dados demográficos/cadastrais
   vindos do Sistema IS / e-SUS PEC — ex.: "qual o nome da sua mãe?", "em
   qual bairro fica sua UBS de referência?"). Estrutura em
   `apps/api/src/modules/auth/first-access/`.
3. Após validado, é gerado um **vínculo permanente** entre o usuário da
   plataforma (banco de controle) e o registro de paciente nas bases
   legadas (`patient_link`), para que os próximos acessos não repitam o
   questionário.
4. Sessão via **JWT de curta duração + refresh token rotativo**, ambos
   armazenados server-side com possibilidade de revogação imediata.

## Banco de controle

As bases do Sistema IS e do e-SUS PEC são **somente leitura** e não são
projetadas para autenticação de portal, controle de tenant/white-label,
tokens ou trilha de auditoria de uma plataforma nova. Um banco de controle
próprio (PostgreSQL gerenciado, ex. Neon/Supabase/RDS — a definir) guarda
exclusivamente:

- `tenants` — cadastro de clientes white-label e suas configurações.
- `users`, `user_identities` — usuários da plataforma e logins sociais
  vinculados.
- `patient_links` — vínculo usuário ⇄ registro de paciente nas bases legadas.
- `otp_codes` — códigos de acesso (hash, não texto puro), canal, expiração.
- `questionnaire_bank`, `questionnaire_attempts` — perguntas de validação e
  tentativas de primeiro acesso.
- `sessions`, `refresh_tokens` — sessões ativas, revogáveis.
- `audit_log` — toda leitura sensível feita nas bases legadas.

Esse banco **nunca** grava nada nas bases do Sistema IS ou do e-SUS PEC.

## Camada de integração com as bases legadas

`apps/api/src/modules/integrations/sistema-is/` e
`.../esus-pec/` implementam o **padrão repositório**: cada repositório expõe
métodos de leitura tipados (ex. `findAtendimentosByPaciente(cpf)`) e usa uma
conexão de banco configurada com um **usuário de banco somente leitura**
(reforçado tanto na aplicação quanto — preferencialmente — na permissão do
próprio banco, ver [`SECURITY.md`](./SECURITY.md)).

O mapeamento exato de tabelas/colunas de cada base ainda será feito junto
com você; por isso os repositórios têm métodos com assinatura definida e
`TODO(db-mapping)` no lugar da query real, para irmos preenchendo conforme
o acesso às bases for liberado.
