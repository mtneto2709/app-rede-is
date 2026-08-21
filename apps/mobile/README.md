# apps/mobile

App híbrido (Expo/React Native) white-label — uma build por cliente.

## Desenvolvimento

```bash
cp .env.example .env
pnpm install
pnpm --filter @rede-is/mobile dev
```

## Build por cliente

Cada cliente tem um perfil em `eas.json` (ver exemplo `demo-production`).
Para adicionar um novo cliente, siga
[`../../docs/ONBOARDING_NOVO_CLIENTE.md`](../../docs/ONBOARDING_NOVO_CLIENTE.md)
e depois rode:

```bash
eas build --profile <slug>-production --platform all
eas submit --profile <slug>-production --platform all
```

## Pendências de conformidade específicas do mobile

- [ ] **Privacy Manifest (iOS)**: a partir do uso de APIs "required reason"
  (ex.: `expo-secure-store` usa Keychain), a Apple exige um
  `PrivacyInfo.xcprivacy` declarando o motivo de uso. O Expo SDK 52+ gera
  isso automaticamente para módulos oficiais — validar no `eas build` antes
  da primeira submissão de cada cliente.
- [ ] **App Tracking Transparency**: não aplicável enquanto nenhum SDK de
  rastreamento entre apps/sites for adicionado. Revisar se isso mudar.
- [ ] **Ícone/splash**: gerar em todas as resoluções exigidas a partir dos
  arquivos em `clients/<slug>/` (usar `expo-asset`/`eas build` para gerar
  automaticamente a partir de um ícone-fonte 1024×1024).
- [ ] Ver checklist completo em
  [`../../APP_STORE_COMPLIANCE.md`](../../APP_STORE_COMPLIANCE.md).
