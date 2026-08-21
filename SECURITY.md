# Segurança

Este projeto lida com **dados sensíveis de saúde** (LGPD, art. 5º, II —
"dado pessoal sensível"), de múltiplos municípios/clientes. Segurança não é
opcional em nenhuma camada.

## Somente leitura

- As conexões com o **Sistema IS** e o **e-SUS PEC** usam, sempre que
  disponível no ambiente de origem, um **usuário de banco de dados com
  permissão `SELECT` apenas** (reforçado no próprio motor do banco, não só
  na aplicação — pedir ao DBA de cada base a criação de um role read-only
  dedicado à integração).
- Nenhum repositório de integração (`apps/api/src/modules/integrations/**`)
  implementa métodos de escrita. Isso é verificado em CI por lint customizado
  que barra `INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE` em qualquer arquivo
  dentro dessas pastas.
- Toda query usa **parâmetros bindados** (nunca concatenação de string) para
  eliminar SQL injection.

## Autenticação e sessão

- **Sem senhas armazenadas pela plataforma**: login social (OAuth 2.0 /
  OIDC) ou código de uso único (OTP) por SMS, WhatsApp ou e-mail.
- OTP: 6 dígitos, hash (nunca texto puro) no banco de controle, expiração
  curta (ex. 5 min), no máximo N tentativas antes de invalidar, rate limit
  por número/e-mail e por IP.
- **Questionário de primeiro acesso**: perguntas geradas de forma
  pseudo-aleatória a partir de um banco de perguntas, evitando reuso do
  mesmo conjunto em tentativas consecutivas; número de erros permitido é
  limitado e o excesso bloqueia novas tentativas por período crescente
  (backoff) e aciona alerta de possível fraude.
- Sessões: **JWT de curta duração** (ex. 15 min) + **refresh token
  rotativo** de uso único, ambos revogáveis no banco de controle
  (logout remoto, "sair de todos os dispositivos").
- Biometria (Face ID/Touch ID/impressão digital Android) como camada
  adicional opcional no app, nunca substituindo o vínculo de identidade
  já validado.

## Proteção de dados em trânsito e em repouso

- TLS obrigatório ponta a ponta (HSTS no portal web).
- Segredos (strings de conexão, chaves JWT, credenciais OAuth, tokens de
  provedor de SMS/WhatsApp) **nunca** em código-fonte — apenas em variáveis
  de ambiente/secret manager (ver [`ENVIRONMENT.md`](./ENVIRONMENT.md)) e
  nunca logados.
- Dados sensíveis em repouso no banco de controle (ex. CPF, quando
  necessário armazenar) são criptografados em nível de coluna; o restante
  do dado clínico não é replicado para o banco de controle — permanece
  apenas nas bases de origem e é buscado sob demanda.
- Logs de aplicação nunca contêm PII/PHI completos (mascarar CPF, telefone,
  e-mail).

## Proteção contra invasão

- **Rate limiting** e **throttling** por IP/usuário em todos os endpoints
  sensíveis (login, OTP, questionário, busca de dados de paciente).
- **Helmet** (cabeçalhos HTTP seguros), **CORS** restrito por tenant/domínio
  cadastrado, **CSRF** protection nas rotas do portal web que usam cookies.
- **RBAC** por tenant: um usuário só enxerga dados do próprio tenant e do
  próprio vínculo de paciente — nunca de outro paciente/município.
- Proteção contra **enumeration attacks** em login (respostas idênticas
  para "usuário não existe" vs "código errado").
- **WAF/Bot protection** na borda (Cloudflare ou equivalente) para o portal
  web e para a API pública.
- Dependência de terceiros com **scan automático de vulnerabilidades**
  (`npm audit`/Dependabot) no CI.
- **Auditoria completa**: toda leitura de dado de paciente é registrada
  (`audit_log`) com quem acessou, o quê, quando e de onde — essencial tanto
  para segurança quanto para prestação de contas perante os municípios.

## Segredos e credenciais de infraestrutura

- Nenhuma credencial de banco, provedor de OTP ou chave de assinatura é
  commitada — `.env` está no `.gitignore`; apenas `.env.example` (sem
  valores reais) fica versionado.
- Rotação periódica de segredos e revogação imediata em caso de
  vazamento suspeito.
- Ambientes (dev/staging/produção) totalmente isolados, com credenciais e
  bancos de controle distintos.
