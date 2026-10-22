# 0005 — Jest (unitário + integração com banco real), Vitest e Playwright

**Status:** aceita

## Contexto

O que mais quebra numa API como esta está na fronteira com o banco (SQL, filtro por dono, conversão de datas) e entre
as partes (cookie, proxy, rotas protegidas). Testes só com mocks não pegam isso; testes só ponta a ponta são lentos
para cobrir cada regra.

## Decisão

Quatro níveis, cada um com o seu papel:

| Nível         | Ferramenta                   | O que prova                                                                                                                    |
| ------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Unitário      | Jest (backend, com mocks)    | Regras isoladas: validações, montagem do SQL, token, tratamento de erros, migrations — em segundos, sem banco                  |
| Integração    | Jest + Supertest             | Requisições HTTP reais contra **bancos de teste reais** (`todo_test` no MySQL e no MongoDB), incluindo regressões de segurança |
| Componente    | Vitest (executor do Angular) | Telas, serviços, guards e interceptor, com a API simulada (`HttpTestingController`)                                            |
| Ponta a ponta | Playwright (Chromium)        | O app inteiro num navegador, com a API e o Angular de verdade em portas próprias                                               |

- **Cobertura mínima** de 90% das linhas (e 80% dos desvios) nos dois projetos, contando **todos** os arquivos —
  inclusive os que nenhum teste carrega.
- Os testes E2E localizam elementos **pelo papel e pelo rótulo** (como um leitor de tela), nunca por classe CSS.
- Cada mudança relevante passa por um **teste de mutação manual**: plantar o defeito, ver o teste falhar, restaurar.
- Tudo roda no **CI** a cada push ([0006](0006-docker-multi-stage-e-nginx.md) para as imagens).

## Consequências

- **+** Os testes de integração pegam o que um mock esconderia (ex.: o deslocamento de um dia nas datas, o filtro por
  dono no SQL).
- **+** O E2E pegou defeitos que nenhum outro nível via (botões do calendário reaproveitados entre meses; o servidor de
  testes não subindo com banco vazio no CI).
- **−** Integração e E2E precisam do MySQL e do MongoDB no ar (`docker compose up -d mysql mongo`); no CI, como
  containers de serviço.
- **−** Os testes de integração rodam em série (compartilham um banco).
- **−** Duas ferramentas de teste no projeto (Jest no backend, Vitest no Angular — o executor padrão do Angular).

**Alternativas descartadas:** Vitest também no backend (daria uma ferramenta só, mas Jest + Supertest é a combinação
mais difundida para testar APIs Node e já estava no plano desde o início); Cypress (o Playwright abre vários contextos
de navegador no mesmo teste — o que permitiu testar o logout numa janela revogando a sessão copiada em outra); testes de
integração com banco em memória (não reproduziriam o MySQL de verdade).

## Onde está

- [`backend/jest.config.mjs`](../../backend/jest.config.mjs) — projetos `unit` e `integration` e os limites de
  cobertura; [`backend/tests/`](../../backend/tests).
- [`frontend/angular.json`](../../frontend/angular.json) — executor de testes e limites de cobertura do Angular.
- [`e2e/playwright.config.ts`](../../e2e/playwright.config.ts) e [`e2e/tests/`](../../e2e/tests).
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — tudo isso a cada push.
