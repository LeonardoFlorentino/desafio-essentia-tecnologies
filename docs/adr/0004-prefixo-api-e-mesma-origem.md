# 0004 — Tudo sob `/api`, servido na mesma origem do site

**Status:** aceita

## Contexto

O frontend (Angular) e a API são projetos separados. Se o navegador falar com eles em endereços diferentes, é preciso
CORS com credenciais, e o cookie de sessão `SameSite=Strict` ([0003](0003-sessao-jwt-em-cookie-com-revogacao.md)) não
vai junto nas chamadas. A solução precisa funcionar igual em desenvolvimento, no Docker e no deploy.

## Decisão

- **Todas as rotas da API começam com `/api`**, e o Angular chama sempre o caminho **relativo** `/api/...`.
- Em cada ambiente, quem serve o site **encaminha `/api` para a API**, então o navegador vê um endereço só:

  | Ambiente         | Quem encaminha                                             |
  | ---------------- | ---------------------------------------------------------- |
  | Desenvolvimento  | servidor do Angular (`proxy.conf.json` → `localhost:3000`) |
  | Docker           | nginx (`location ^~ /api/` → container `api`)              |
  | Deploy (Render)  | regra de _rewrite_ do site estático (`/api/*` → a API)     |
  | E2E (Playwright) | servidor do Angular com `e2e/proxy.conf.json` → porta 3100 |

- O cookie de sessão tem `Path=/api`: só vai nas chamadas à API, nunca nos arquivos do site.
- **CORS** fica restrito a uma origem configurável (`CORS_ORIGIN`), para chamadas diretas à API; no uso normal não é
  necessário.

## Consequências

- **+** Sem CORS no caminho normal; cookie `SameSite=Strict` funciona; o frontend não precisa saber o endereço da API.
- **+** A documentação (`/api/docs`) e a especificação (`/api/openapi.json`) ficam no mesmo prefixo.
- **−** Cada ambiente precisa da sua regra de encaminhamento. Um erro nela é sutil: no nginx, a regra de cache para
  `.js` (expressão regular) tinha prioridade sobre o prefixo `/api/` e quebrou o Swagger até o `^~` ser adicionado.
- **−** Atrás de proxies, o IP do visitante vem do `X-Forwarded-For`, e a API precisa saber quantos proxies confiar
  (`TRUST_PROXY`) para o limite de tentativas continuar por pessoa.

**Alternativas descartadas:** API em outro domínio com CORS + `SameSite=None` (cookie mais exposto a CSRF);
servir o Angular pela própria API (acopla o deploy dos dois).

## Onde está

- [`frontend/src/app/tasks/task.service.ts`](../../frontend/src/app/tasks/task.service.ts) — caminho relativo
  `/api/tasks`.
- [`frontend/proxy.conf.json`](../../frontend/proxy.conf.json), [`frontend/nginx.conf`](../../frontend/nginx.conf),
  [`render.yaml`](../../render.yaml) e [`e2e/proxy.conf.json`](../../e2e/proxy.conf.json) — o encaminhamento em cada
  ambiente.
- [`backend/src/app.ts`](../../backend/src/app.ts) — rotas sob `/api`, CORS e `trust proxy`.
- [`backend/src/auth/session.ts`](../../backend/src/auth/session.ts) — `Path=/api` do cookie.
