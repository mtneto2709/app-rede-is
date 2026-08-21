# Clientes white-label

Cada subpasta é um cliente (tenant) com sua própria identidade visual e
política de autenticação. `demo/` é um cliente de exemplo usado em
desenvolvimento — nunca aponte um domínio real de produção para ele.

Para criar um novo cliente, siga
[`../docs/ONBOARDING_NOVO_CLIENTE.md`](../docs/ONBOARDING_NOVO_CLIENTE.md).

Estrutura esperada em cada `clients/<slug>/`:

```
theme.json       # obrigatório — validado contra @rede-is/theme-tokens
logo-light.svg
logo-dark.svg
icon.png         # 1024x1024, sem transparência (App Store)
favicon.png
splash.png
```
