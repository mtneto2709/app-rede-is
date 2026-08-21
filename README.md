# Rede IS — Portal & App do Cidadão

Plataforma white-label (portal web + app móvel híbrido) que dá a pacientes e
municípios acesso de leitura aos seus dados de saúde, consolidando
informações do **Sistema IS** (base própria) e do **e-SUS PEC** (base do
Ministério da Saúde) em uma única experiência: atendimentos realizados,
agendamentos/consultas/exames marcados, carteirinhas (SUS e planos de
saúde), unidades de saúde da rede, entre outros serviços.

A plataforma é desenvolvida **uma única vez** e distribuída em **múltiplas
compilações**, uma por cliente (município/operadora), cada uma com sua
própria identidade visual (logo, cores, nome) e publicada na App Store /
Play Store da própria conta do cliente.

## Documentos

| Documento | Conteúdo |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Visão geral do monorepo, fluxo de dados, multi-tenant/white-label |
| [`STACK_DECISION.md`](./STACK_DECISION.md) | Por que React Native + Next.js, e alternativas consideradas |
| [`SECURITY.md`](./SECURITY.md) | Modelo de ameaças e controles de segurança |
| [`APP_STORE_COMPLIANCE.md`](./APP_STORE_COMPLIANCE.md) | Checklist de conformidade Apple/Google |
| [`ENVIRONMENT.md`](./ENVIRONMENT.md) | Variáveis de ambiente (as 2 bases de leitura + banco de controle) |
| [`docs/ONBOARDING_NOVO_CLIENTE.md`](./docs/ONBOARDING_NOVO_CLIENTE.md) | Como criar a build de um novo cliente white-label |

## Estrutura do monorepo

```
apps/
  web/      Portal web (Next.js) — portal do cidadão + área administrativa do tenant
  mobile/   App híbrido (Expo/React Native) — publicado por cliente nas lojas
  api/      Backend (NestJS) — auth, integrações somente-leitura, regras de negócio
packages/
  config/         Validação central de variáveis de ambiente (zod)
  shared-types/   Tipos de domínio compartilhados (paciente, atendimento, tenant...)
  theme-tokens/   Sistema de temas white-label (cores, logos, tipografia por cliente)
clients/
  <slug-do-cliente>/   Configuração white-label de cada cliente (tema, ícones, bundle id)
```

## Princípios do projeto

1. **Somente leitura nas bases externas.** Nenhuma escrita é feita no Sistema
   IS ou no e-SUS PEC — ver [`SECURITY.md`](./SECURITY.md#somente-leitura).
2. **Um código-fonte, N distribuições.** Nenhuma lógica de cliente é
   hard-coded; tudo vem de configuração de tenant (`clients/<slug>` + tabela
   `tenants` no banco de controle).
3. **Segurança em primeiro lugar.** Autenticação forte (social login + OTP
   SMS/WhatsApp/e-mail + questionário de validação no primeiro acesso),
   segredos nunca em código, todas as consultas parametrizadas, auditoria de
   acesso.
4. **Conformidade com as lojas desde o início**, não como ajuste de última
   hora — ver [`APP_STORE_COMPLIANCE.md`](./APP_STORE_COMPLIANCE.md).
5. **Projeto 100% autônomo.** Este repositório não depende de nenhuma
   plataforma de hospedagem/desenvolvimento de terceiros (sem configuração,
   scripts ou banners de Replit ou similares) — roda em qualquer ambiente
   Node.js padrão, self-hosted ou em qualquer cloud.

## Status

🚧 Scaffold inicial do monorepo, dos módulos de autenticação/integração e das
telas principais. O mapeamento real das tabelas do Sistema IS e do e-SUS PEC
será feito de forma incremental, conforme os acessos às bases forem
fornecidos (ver `TODO(db-mapping)` no código).
