# Onboarding de um novo cliente (white-label)

Checklist para colocar um novo município/operadora em produção sem tocar em
código de negócio — tudo aqui é configuração.

## 1. Criar a configuração do tenant

```bash
mkdir clients/<slug>
```

Crie `clients/<slug>/theme.json` seguindo o schema de
`packages/theme-tokens/src/schema.ts` (copie `clients/demo/theme.json` como
ponto de partida). Adicione também `logo-light.svg`, `logo-dark.svg`,
`icon.png` (1024×1024), `favicon.png`, `splash.png`.

## 2. Cadastrar o tenant no banco de controle

```bash
pnpm --filter @rede-is/api prisma:seed # ou um script dedicado de tenant
```

Garanta que a tabela `Tenant` tenha uma linha com `slug = "<slug>"` e que
`QuestionnaireQuestion` tenha perguntas cadastradas para esse tenant (o
primeiro acesso não funciona sem isso).

## 3. Configurar DNS / domínio

- Portal web: aponte `<slug>.redeis.app` (ou o domínio próprio do cliente)
  para a instância de `apps/web`, e liste o domínio em
  `clients/<slug>/theme.json` -> `web.domains`.
- Confirme que `CORS_ALLOWED_ORIGINS` na API inclui esse domínio.

## 4. Credenciais de autenticação do cliente

- OAuth (se o tenant habilitar `google`/`apple` em `auth.socialProviders`):
  criar client ID próprio do cliente ou reusar um compartilhado, conforme
  acordado.
- Provedor de SMS/WhatsApp/e-mail: confirmar que o remetente/número está
  aprovado para esse cliente (alguns provedores exigem aprovação por
  remetente).

## 5. Build mobile

1. Adicione um perfil em `apps/mobile/eas.json` para o cliente (copie
   `demo-production`), com `EXPO_PUBLIC_TENANT_SLUG=<slug>`.
2. Preencha `mobile.iosBundleId` / `mobile.androidPackage` em
   `theme.json` com identificadores exclusivos deste cliente.
3. O cliente precisa ter suas próprias contas Apple Developer e Google Play
   Console — a distribuição é por conta do cliente, não da nossa.
4. Rode `eas build --profile <slug>-production --platform all`.
5. Preencha `eas submit` no `eas.json` com as credenciais do cliente e rode
   `eas submit`.
6. Siga o checklist completo em `../APP_STORE_COMPLIANCE.md` antes de
   enviar para revisão.

## 6. Mapeamento de dados (se o cliente usa uma base diferente)

Se o município usa uma instância própria do Sistema IS e/ou e-SUS PEC com
schema diferente do já mapeado, isso pode exigir ajustes nos repositórios
em `apps/api/src/modules/integrations/**` — nesse caso, trate como uma
tarefa de engenharia, não apenas configuração.

## 7. Checklist final antes de ativar o cliente

- [ ] `theme.json` validado (rodar o app localmente com
      `EXPO_PUBLIC_TENANT_SLUG=<slug>` e o portal com o subdomínio local)
- [ ] Tenant e perguntas do questionário cadastrados no banco de controle
- [ ] Domínio do portal ativo com HTTPS
- [ ] CORS configurado
- [ ] Provedores de OTP aprovados para o remetente do cliente
- [ ] Builds mobile enviadas e aprovadas nas lojas do cliente
- [ ] Termo de Uso e Política de Privacidade específicos do cliente
