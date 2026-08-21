# Conformidade com App Store e Play Store

Checklist para evitar rejeição na publicação de cada build white-label.
Como cada cliente publica em **sua própria conta de desenvolvedor**, este
checklist deve ser seguido a cada novo cliente (ver
[`docs/ONBOARDING_NOVO_CLIENTE.md`](./docs/ONBOARDING_NOVO_CLIENTE.md)).

## Apple App Store

- [ ] **Guideline 4.2 (Minimum Functionality)**: o app não pode ser uma
  WebView fina — por isso a escolha de React Native com telas nativas
  (ver [`STACK_DECISION.md`](./STACK_DECISION.md)).
- [ ] **Guideline 5.1.1 (Privacidade de dados de saúde)**: Privacy Policy
  própria por cliente, acessível dentro do app e na ficha da loja,
  detalhando coleta/uso de dados de saúde.
- [ ] **App Privacy ("Nutrition Label")** preenchida corretamente no App
  Store Connect por build (dados de saúde, identificadores, contato).
- [ ] **Sign in with Apple obrigatório** sempre que outro login social
  (Google, Facebook etc.) estiver disponível (Guideline 4.8).
- [ ] **App Tracking Transparency (ATT)** — só solicitar se houver
  rastreamento entre apps/sites de terceiros (não aplicável ao escopo
  atual, mas revisar antes de integrar qualquer SDK de analytics/ads).
- [ ] **Permissões com justificativa clara** (`NSCameraUsageDescription`,
  `NSFaceIDUsageDescription`, `NSContactsUsageDescription` etc.) — só
  solicitar o que é de fato usado.
- [ ] **Conta de teste** disponível para o revisor da Apple (usuário/senha
  ou fluxo de OTP de teste que não dependa de SMS real).
- [ ] Ícone, nome e metadados **sem** menção a "beta", "teste" ou qualquer
  branding que não seja o do cliente final.
- [ ] Suporte a **Dark Mode** e **Dynamic Type** (acessibilidade).

## Google Play Store

- [ ] **Política de Dados do Usuário / Data Safety form** preenchido por
  build, coerente com o que o app realmente coleta/transmite.
- [ ] **Declaração de app de saúde sensível**, se aplicável às políticas
  vigentes da categoria "Medical"/"Health & Fitness".
- [ ] **Target API level** sempre na versão mínima exigida pela Play Store
  no momento do build (atualizar `compileSdkVersion`/`targetSdkVersion` via
  Expo/EAS a cada ciclo).
- [ ] **Permissões em runtime** solicitadas apenas no momento do uso, nunca
  todas no primeiro login.
- [ ] **Política de Contas de Teste** para a revisão do Google (mesmo
  requisito de conta de teste da Apple).
- [ ] **Assinatura de app gerenciada pelo Google Play (Play App Signing)**
  habilitada por cliente.

## Comuns às duas lojas

- [ ] **LGPD**: Termo de Uso e Política de Privacidade específicos por
  cliente/tenant, com base legal declarada para tratamento de dado de
  saúde (consentimento do titular / tutela pelo poder público, conforme o
  caso).
- [ ] **Exclusão de conta** disponível dentro do app (exigência tanto da
  Apple quanto do Google desde 2022/2023) — endpoint
  `DELETE /me` no `apps/api` que anonimiza o usuário e revoga vínculos,
  sem apagar o histórico clínico (que não pertence à plataforma).
- [ ] **Sem coleta de dados além do necessário** (data minimization) — cada
  novo dado coletado precisa de justificativa documentada.
- [ ] **Build reprodutível por cliente**: cada `clients/<slug>` gera um
  binário isolado, sem vazamento de branding/config de outro cliente.
- [ ] **Testes em dispositivo real** (iOS e Android) antes de cada
  submissão — TestFlight / Internal Testing track.
- [ ] Changelog e versão semântica por cliente documentados em cada release.
