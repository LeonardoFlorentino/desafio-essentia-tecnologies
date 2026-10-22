# 0003 — Sessão em JWT num cookie HttpOnly, com revogação no logout

**Status:** aceita

## Contexto

O desafio sugere autenticação com JWT. O jeito mais comum — guardar o token no `localStorage` e mandá-lo num header
`Authorization` — deixa o token ao alcance de qualquer script da página: um XSS rouba a sessão. E um JWT "puro" vale
até expirar, mesmo depois de a pessoa clicar em "Sair".

## Decisão

- O **JWT** (HS256, algoritmo fixo na verificação, segredo de no mínimo 32 caracteres, 8 h de validade) vai num
  **cookie `HttpOnly`** (`SameSite=Strict`, `Secure` em produção, `Path=/api`). O Angular **nunca** vê o token: pergunta
  à API quem está logado (`GET /api/auth/me`) ao iniciar.
- Cada token tem um **id único (`jti`)**. O **logout grava o `jti`** numa tabela `revoked_tokens` até a hora em que o
  token expiraria; o middleware que protege as rotas recusa token revogado e token sem `jti`. Só aquela sessão acaba —
  a mesma conta em outro navegador continua.
- Senhas com **bcrypt** (custo 12); login responde a mesma mensagem, e no mesmo tempo, para e-mail inexistente e senha
  errada; **5 falhas de login por minuto** por IP → `429`.

## Consequências

- **+** XSS não consegue ler a sessão; `SameSite=Strict` + corpo só em JSON + CORS restrito fecham o CSRF.
- **+** "Sair" invalida o token de verdade, inclusive cópias dele.
- **−** A revogação devolve um pouco de estado ao servidor: **uma consulta por chave primária a cada requisição
  protegida**. As linhas expiradas são apagadas sempre que a API inicia.
- **−** Cookie `SameSite=Strict` exige que site e API estejam na mesma origem (ver [0004](0004-prefixo-api-e-mesma-origem.md)).
- **−** O limite de tentativas fica na memória da API (zera ao reiniciar; com várias instâncias precisaria de um
  armazenamento compartilhado, como Redis).

**Alternativas descartadas:** token no `localStorage` + `Authorization: Bearer` (exposto a XSS); sessão no servidor
com `express-session` (resolveria a revogação, mas o desafio pede JWT); lista de tokens _válidos_ em vez de revogados
(uma escrita por login em vez de uma por logout).

## Onde está

- [`backend/src/auth/session.ts`](../../backend/src/auth/session.ts) — cookie, `requireAuth` e `endSession`.
- [`backend/src/auth/auth.service.ts`](../../backend/src/auth/auth.service.ts) — bcrypt, emissão e verificação do JWT.
- [`backend/src/auth/revoked-tokens.ts`](../../backend/src/auth/revoked-tokens.ts) e
  [`backend/migrations/005_create_revoked_tokens.sql`](../../backend/migrations/005_create_revoked_tokens.sql).
- [`backend/src/auth/rate-limit.ts`](../../backend/src/auth/rate-limit.ts) — limite de tentativas.
- [`frontend/src/app/auth/auth.service.ts`](../../frontend/src/app/auth/auth.service.ts) e
  [`frontend/src/app/auth/session-expired.interceptor.ts`](../../frontend/src/app/auth/session-expired.interceptor.ts).
- [`backend/tests/integration/token-revocation.test.ts`](../../backend/tests/integration/token-revocation.test.ts) e
  [`e2e/tests/auth.spec.ts`](../../e2e/tests/auth.spec.ts).
