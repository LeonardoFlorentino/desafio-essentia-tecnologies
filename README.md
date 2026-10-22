# TechX Tasks

Aplicação web de gerenciamento de tarefas (to-do list) desenvolvida para o desafio Full Stack da Essentia Group:
cada pessoa cria uma conta e organiza as próprias tarefas do dia.

- **Frontend:** Angular 22
- **Backend:** API RESTful em Node.js + TypeScript (Express)
- **Bancos de dados:** MySQL (usuários e tarefas) e MongoDB (notas, tags e histórico das tarefas)

> **Usuário de demonstração:** `demo@techx.com` / `demo12345` — já vem com algumas tarefas.
>
> **Documentação interativa da API (Swagger):** `/api/docs` — http://localhost:8080/api/docs com Docker ou
> http://localhost:3000/api/docs em desenvolvimento.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Requisitos do desafio](#requisitos-do-desafio)
- [Tecnologias e decisões](#tecnologias-e-decisões)
- [Como rodar](#como-rodar)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Backend](#backend)
- [API](#api)
- [Frontend](#frontend)
- [Testes e qualidade](#testes-e-qualidade)
- [Contribuindo](#contribuindo)
- [Problemas comuns](#problemas-comuns)

## Funcionalidades

- **Página inicial com todas as tarefas cadastradas** da pessoa conectada, das mais recentes para as mais antigas, com
  título, descrição e situação, e um resumo com o total, as pendentes e as concluídas.
- **Criar tarefa:** título (obrigatório) e descrição (opcional); a nova tarefa aparece no topo da lista.
- **Editar tarefa:** "Editar" abre título e descrição dentro da própria lista; "Salvar" grava, "Cancelar" ou Esc
  descarta.
- **Marcar como concluída ou não:** uma caixa de seleção em cada tarefa; a concluída aparece riscada.
- **Excluir tarefa:** pede confirmação com o nome da tarefa antes de apagar.
- **Notas, tags e histórico:** "Detalhes" abre notas livres e tags (guardadas no MongoDB) e o histórico da tarefa —
  criação, edições com o valor antes e depois, conclusões e alterações de notas e tags, com data e hora.
- **Contas e sessão:** cadastro (`/register`) e login (`/login`); cada pessoa vê e altera só as próprias tarefas. O
  botão "Sair" encerra a sessão; se ela expirar com a página aberta, a próxima ação leva ao login com o aviso "Sua
  sessão expirou".
- **Estados e erros:** mensagens de carregamento, de lista vazia e de falha (com "Tentar novamente"); quando uma ação
  falha, um aviso explica o motivo — inclusive "sem conexão com o servidor" — e nada do que foi digitado se perde.
- **Responsivo e acessível:** do celular (360 px) ao desktop, sem rolagem horizontal; rótulos em todos os campos,
  foco visível e movido de forma previsível ao editar e excluir.

## Requisitos do desafio

| Requisito                                              | Onde está                                                                                                |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Interface em Angular                                   | [`frontend/`](frontend)                                                                                  |
| Página inicial exibe todas as tarefas cadastradas      | [`task-list-page`](frontend/src/app/tasks/task-list-page.ts), rota `/`                                   |
| Adicionar, editar e remover tarefas                    | Formulário da página, [`task-item`](frontend/src/app/tasks/task-item.ts)                                 |
| Marcar tarefas como concluídas ou não                  | Caixa de seleção em cada tarefa → `PATCH /api/tasks/:id`                                                 |
| API RESTful em Node.js e TypeScript                    | [`backend/src`](backend/src)                                                                             |
| Criar, listar, atualizar e excluir tarefas             | `POST`, `GET`, `PATCH` e `DELETE` em `/api/tasks` ([API](#api))                                          |
| Banco MySQL                                            | [`backend/migrations`](backend/migrations), [`task.repository`](backend/src/tasks/task.repository.ts)    |
| Git com commits incrementais e descritivos             | Histórico da branch, um commit por etapa, no padrão Conventional Commits                                 |
| README com instruções para configurar e executar       | [Como rodar](#como-rodar)                                                                                |
| Extra: autenticação com JWT                            | [`backend/src/auth`](backend/src/auth), [`frontend/src/app/auth`](frontend/src/app/auth)                 |
| Extra: MongoDB para informações adicionais das tarefas | [`task-details`](backend/src/tasks/task-details.ts), [`task-history`](backend/src/tasks/task-history.ts) |

## Tecnologias e decisões

| Tema                   | Escolha                                                             | Motivo                                                                                                             |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| API                    | Express 5 + TypeScript (`strict`)                                   | Pouca estrutura imposta; erros de rotas assíncronas chegam sozinhos ao tratador central                            |
| Acesso ao MySQL        | `mysql2` com SQL escrito à mão, sempre parametrizado                | Mostra o SQL de fato; filtro por dono em todas as consultas; sem risco de SQL injection                            |
| Esquema do MySQL       | Migrations SQL numeradas + runner próprio                           | Esquema versionado junto com o código e aplicado igual em qualquer máquina                                         |
| Validação              | zod                                                                 | Uma definição por campo valida a entrada e gera o tipo TypeScript                                                  |
| MySQL e MongoDB juntos | Tarefas e usuários no MySQL; notas, tags e histórico no MongoDB     | Dados com relacionamento e regras fixas no relacional; dados de formato livre e um log que só cresce em documentos |
| Sessão                 | JWT (HS256) em cookie `HttpOnly` + `SameSite=Strict`                | O token nunca fica acessível a scripts da página (XSS não rouba a sessão) e não vai em requisições de outros sites |
| Senhas                 | bcrypt (custo 12, via `bcryptjs`)                                   | Hash lento contra força bruta; versão em JavaScript puro, sem compilação nativa                                    |
| Acesso entre contas    | Tarefa de outra pessoa responde `404`                               | Não revela nem que a tarefa existe                                                                                 |
| Frontend               | Angular 22 standalone, signals, sem zone.js                         | Estado explícito e menos código de infraestrutura                                                                  |
| Front e API            | Mesma origem: o Angular encaminha `/api` para a API                 | Sem CORS no navegador e cookie `SameSite=Strict` funcionando                                                       |
| Ambiente               | `docker compose up --build` sobe tudo; `npm start` para desenvolver | Quem avalia roda o projeto com um comando, sem instalar Node nem banco nenhum                                      |
| Servir o site          | nginx com o build do Angular, encaminhando `/api` para a API        | Mesma origem em produção (como o proxy do `ng serve` em desenvolvimento); cache longo só para arquivos com hash    |
| Testes                 | Jest + Supertest (API), Vitest (Angular)                            | Testes da API fazem requisições HTTP reais contra bancos de teste separados                                        |

## Como rodar

Há duas formas: **com Docker apenas** (o jeito mais rápido de avaliar, em qualquer sistema) ou **em modo de
desenvolvimento** (código-fonte com recarga automática).

### Opção 1 — Aplicação completa com Docker (qualquer sistema)

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) aberto (com Docker Compose v2). Não é
preciso ter Node.js instalado. Na raiz do projeto:

```bash
docker compose up --build
```

Na primeira vez, as imagens são construídas (alguns minutos). Os containers sobem em ordem — bancos saudáveis → API
(aplica as migrations e cria o usuário de demonstração) → site — e a aplicação fica em **http://localhost:8080**.
Entre com `demo@techx.com` / `demo12345`.

- O site é servido por um **nginx**, que também encaminha `/api` para a API: página e API na mesma origem. A API não
  fica exposta fora do Docker.
- As imagens são construídas em duas fases (compilação → só o resultado) e rodam sem usuário root.
- Para mudar a porta ou o segredo da sessão, copie o `.env.example` da raiz para `.env` (`WEB_PORT`, `JWT_SECRET`).

### Opção 2 — Desenvolvimento

Pré-requisitos: Docker Desktop aberto e [Node.js](https://nodejs.org/) 22 ou superior (com npm). Neste modo, só os
bancos rodam no Docker; a API e o Angular rodam a partir do código, recarregando a cada alteração.

#### Início rápido (Windows)

Na raiz do projeto:

```bash
npm start
```

O comando prepara e sobe tudo, nesta ordem, e para com uma explicação se algum passo falhar:

1. Na primeira execução, cria os arquivos `.env` a partir dos `.env.example` e instala as dependências.
2. Sobe o MySQL e o MongoDB e espera os dois ficarem saudáveis.
3. Aplica as migrations do MySQL e garante o usuário de demonstração.
4. Abre o backend numa nova aba do terminal (Windows Terminal; sem ele, numa janela do PowerShell) e espera a API
   responder (até 60 s).
5. Só então abre o frontend em outra aba e espera ele responder (até 120 s).
6. Devolve o foco ao terminal onde o comando foi digitado.

Depois, abra **http://localhost:4200** e entre com `demo@techx.com` / `demo12345`.

#### Passo a passo (qualquer sistema)

```bash
# 1. Bancos de dados (MySQL e MongoDB)
docker compose up -d mysql mongo

# 2. Backend — num terminal
cd backend
npm install
cp .env.example .env   # no PowerShell: Copy-Item .env.example .env
npm run migrate        # cria as tabelas no MySQL
npm run seed           # cria o usuário de demonstração
npm run dev            # http://localhost:3000

# 3. Frontend — em outro terminal
cd frontend
npm install
npm start              # http://localhost:4200
```

Os containers ficam prontos quando `docker compose ps` mostra `healthy` nos dois. Os valores padrão funcionam sem
configuração (MySQL e MongoDB com usuário e senha `todo`); para alterá-los, copie o `.env.example` da raiz para `.env`.

### Endereços

| O quê               | Opção 1 (Docker)                     | Opção 2 (desenvolvimento)            |
| ------------------- | ------------------------------------ | ------------------------------------ |
| Aplicação           | http://localhost:8080                | http://localhost:4200                |
| API                 | http://localhost:8080/api            | http://localhost:3000/api            |
| Situação da API     | http://localhost:8080/api/health     | http://localhost:3000/api/health     |
| Documentação da API | http://localhost:8080/api/docs       | http://localhost:3000/api/docs       |
| MySQL / MongoDB     | `localhost:3306` / `localhost:27017` | `localhost:3306` / `localhost:27017` |

### Para parar

`docker compose down` (na opção 2, feche também as abas do backend e do frontend). Os dados ficam nos volumes
`mysql-data` e `mongo-data`, compartilhados pelas duas opções; `docker compose down -v` apaga tudo (o usuário de
demonstração é recriado na próxima subida).

## Estrutura do projeto

```
├── backend/
│   ├── migrations/          Esquema do MySQL em SQL numerado (001 a 004)
│   ├── src/
│   │   ├── auth/            Cadastro, login, sessão (JWT em cookie) e usuários
│   │   ├── db/              Conexões (MySQL, MongoDB), migrations e seed
│   │   ├── http/            Tratamento central de erros
│   │   ├── tasks/           Rotas, validação, MySQL (tarefas) e MongoDB (detalhes e histórico)
│   │   ├── app.ts           Monta a aplicação Express
│   │   └── server.ts        Conecta ao MongoDB e abre a porta
│   └── tests/integration/   Testes da API contra bancos de teste
├── frontend/src/app/
│   ├── auth/                Login, cadastro, guards e tratamento de sessão expirada
│   ├── tasks/               Página de tarefas, cartão, painel de detalhes, serviço da API
│   └── shared/              Utilitários compartilhados
├── docker/mysql-init/       Cria o banco de testes do MySQL
├── docker-compose.yml       MySQL, MongoDB, API e site (nginx)
└── start.ps1                Inicialização com um comando (npm start)
```

## Backend

Se o `backend/.env` estiver faltando ou incompleto, a API não sobe e informa quais variáveis precisam ser definidas.

| Variável         | Obrigatória | Padrão                  | Descrição                                                                 |
| ---------------- | ----------- | ----------------------- | ------------------------------------------------------------------------- |
| `PORT`           | não         | `3000`                  | Porta HTTP da API                                                         |
| `CORS_ORIGIN`    | não         | `http://localhost:4200` | Origem do navegador autorizada a chamar a API diretamente                 |
| `DB_HOST`        | sim         | —                       | Host do MySQL                                                             |
| `DB_PORT`        | não         | `3306`                  | Porta do MySQL                                                            |
| `DB_USER`        | sim         | —                       | Usuário do MySQL                                                          |
| `DB_PASSWORD`    | sim         | —                       | Senha do MySQL                                                            |
| `DB_NAME`        | sim         | —                       | Nome do banco no MySQL                                                    |
| `MONGO_URL`      | sim         | —                       | Endereço do MongoDB, com usuário e senha                                  |
| `MONGO_DB_NAME`  | não         | `todo`                  | Nome do banco no MongoDB                                                  |
| `JWT_SECRET`     | sim         | —                       | Segredo que assina os tokens de sessão (mínimo 32 caracteres)             |
| `JWT_EXPIRES_IN` | não         | `8h`                    | Duração da sessão (`30m`, `8h`, `7d`...)                                  |
| `COOKIE_SECURE`  | não         | `true` em produção      | Cookie de sessão só por HTTPS (`false` no Docker local, servido por HTTP) |

O `backend/.env.example` já traz valores que funcionam com o `docker-compose.yml`.

| Script            | O que faz                                                                         |
| ----------------- | --------------------------------------------------------------------------------- |
| `npm run dev`     | Sobe a API em modo de desenvolvimento (recarrega a cada alteração)                |
| `npm run build`   | Compila o TypeScript para `dist/`                                                 |
| `npm start`       | Sobe a versão compilada                                                           |
| `npm run migrate` | Aplica as migrations pendentes                                                    |
| `npm run seed`    | Cria o usuário demo com tarefas de exemplo (pode rodar de novo sem duplicar nada) |
| `npm test`        | Roda os testes de integração                                                      |
| `npm run lint`    | Analisa o código com ESLint e valida o documento OpenAPI                          |
| `npm run format`  | Formata o código com Prettier                                                     |

**Situação da API:** `GET /api/health` responde `200 { "status": "ok", "mysql": "ok", "mongo": "ok" }`. Se um dos
bancos estiver fora do ar, responde `503` e diz qual. A API não sobe sem conseguir conectar ao MongoDB e se reconecta
sozinha quando ele volta.

**Migrations:** o esquema do MySQL fica em arquivos SQL numerados em `backend/migrations/`. O `npm run migrate` aplica,
em ordem, os que ainda não constam na tabela `migrations`; rodar de novo não faz nada se estiver tudo aplicado.

**Seed:** o `npm run seed` cria o usuário de demonstração com três tarefas de exemplo, com prazos relativos ao dia em
que roda (ontem, hoje e daqui a três dias) e prioridades diferentes. Tarefas criadas antes da
existência de contas (sem dono) passam para ele.

## API

A especificação completa está em **OpenAPI 3** ([`backend/docs/openapi.yaml`](backend/docs/openapi.yaml)), com
schemas, exemplos e todas as respostas de erro. Ela é servida pela própria API:

- **`/api/docs`** — Swagger UI: dá para testar cada rota pelo navegador. Faça `POST /auth/login` com o usuário de
  demonstração e as chamadas seguintes já saem autenticadas (o cookie de sessão vai sozinho).
- **`/api/openapi.json`** — o documento em JSON, para importar no Postman, Insomnia ou gerar clientes.

O documento é validado contra o padrão OpenAPI no `npm run lint`, e um teste chama cada operação documentada para
garantir que ela existe de fato na API.

Todas as rotas ficam sob o prefixo `/api` e respondem em JSON. As rotas de **tarefas exigem sessão** (sem ela: `401`)
e só enxergam as tarefas da pessoa conectada — a tarefa de outra pessoa responde `404`, como se não existisse.

| Método | Rota                 | Descrição                                                                 | Sucesso |
| ------ | -------------------- | ------------------------------------------------------------------------- | ------- |
| GET    | `/health`            | Situação da API e dos dois bancos                                         | 200     |
| POST   | `/auth/register`     | Cria a conta e já inicia a sessão                                         | 201     |
| POST   | `/auth/login`        | Inicia a sessão                                                           | 200     |
| GET    | `/auth/me`           | Usuário da sessão atual                                                   | 200     |
| POST   | `/auth/logout`       | Encerra a sessão (resposta sem corpo)                                     | 204     |
| GET    | `/tasks`             | Lista as tarefas, com filtros, busca e ordenação opcionais                | 200     |
| POST   | `/tasks`             | Cria uma tarefa                                                           | 201     |
| GET    | `/tasks/:id`         | Busca uma tarefa pelo id                                                  | 200     |
| PATCH  | `/tasks/:id`         | Atualiza parcialmente uma tarefa (inclui marcar/desmarcar como concluída) | 200     |
| DELETE | `/tasks/:id`         | Exclui uma tarefa e os detalhes dela (resposta sem corpo)                 | 204     |
| GET    | `/tasks/:id/details` | Notas e tags da tarefa (MongoDB)                                          | 200     |
| PUT    | `/tasks/:id/details` | Grava as notas e as tags (substitui as anteriores)                        | 200     |
| GET    | `/tasks/:id/history` | Histórico da tarefa, das ações mais recentes para as antigas (MongoDB)    | 200     |

### Tarefas

`GET /api/tasks`:

```json
[
  {
    "id": 1,
    "title": "Revisar o relatório",
    "description": "Conferir os números do trimestre",
    "completed": false,
    "dueDate": "2026-10-30",
    "priority": "high",
    "createdAt": "2026-10-22T13:39:15.000Z",
    "updatedAt": "2026-10-22T13:39:15.000Z"
  }
]
```

Sem parâmetros, a lista traz todas as tarefas, das mais recentes para as antigas. Parâmetros opcionais (combináveis;
valor desconhecido responde `400`):

| Parâmetro  | Valores                                       | Efeito                                                                                    |
| ---------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `status`   | `all` (padrão), `pending`, `completed`        | Filtra pela situação                                                                      |
| `priority` | `low`, `medium`, `high`                       | Filtra pela prioridade                                                                    |
| `search`   | texto, até 100 caracteres                     | Busca no título e na descrição, sem diferenciar maiúsculas (`%` e `_` valem como texto)   |
| `sort`     | `created_at` (padrão), `due_date`, `priority` | Ordena; por prazo, as tarefas sem prazo ficam por último                                  |
| `order`    | `asc`, `desc`                                 | Inverte a ordem; o padrão é o natural de cada `sort` (recentes, prazo mais próximo, alta) |

Exemplo: `GET /api/tasks?status=pending&priority=high&sort=due_date` — pendentes de prioridade alta, prazo mais
próximo primeiro.

`POST /api/tasks` responde `201` com a tarefa criada:

```json
{
  "title": "Revisar o relatório",
  "description": "Conferir os números do trimestre",
  "dueDate": "2026-10-30",
  "priority": "high"
}
```

`PATCH /api/tasks/:id` altera apenas os campos enviados (pelo menos um). Para marcar como concluída:
`{ "completed": true }`; para tirar o prazo: `{ "dueDate": null }`.

| Campo         | Regras                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| `title`       | Obrigatório, texto, 1 a 255 caracteres (sem espaços nas pontas)                    |
| `description` | Opcional, texto, até 5000 caracteres; vazia é salva como `null`                    |
| `dueDate`     | Opcional, dia `AAAA-MM-DD` que exista (sem hora nem fuso) ou `null`; padrão `null` |
| `priority`    | Opcional, `low`, `medium` ou `high`; padrão `medium`                               |
| `completed`   | Só no `PATCH`: `true` ou `false`                                                   |

### Detalhes e histórico (MongoDB)

A tarefa em si (título, descrição, situação, dono) fica no MySQL; o MongoDB guarda as informações adicionais:

- **Detalhes** (coleção `task_details`, um documento por tarefa): notas e tags, dados de formato livre que não pedem
  colunas fixas. `PUT /api/tasks/:id/details` com
  `{ "notes": "Levar o notebook para a reunião", "tags": ["reunião", "urgente"] }`. Notas até 10000 caracteres; até
  10 tags de 1 a 30 caracteres (repetidas, sem diferenciar maiúsculas, são descartadas).
- **Histórico** (coleção `task_events`): cada ação vira um registro — `created`, `updated` (com o valor antes e depois
  de cada campo alterado), `completed`, `reopened`, `details_updated` e `deleted`. Se o MongoDB falhar ao registrar, a
  ação principal (no MySQL) não é desfeita: o erro vai para o log e só aquela entrada do histórico se perde.

Os dois são filtrados pelo dono da tarefa, como no MySQL.

### Autenticação

Cadastro e login respondem `{ "user": { "id": 1, "email": "ana@techx.com" } }` e guardam a sessão (um JWT HS256) num
**cookie `HttpOnly`, `SameSite=Strict`**, restrito ao caminho `/api` e com `Secure` em produção:

- `HttpOnly`: scripts da página não conseguem ler o token, então um ataque XSS não rouba a sessão;
- `SameSite=Strict`: o navegador não envia o cookie em requisições iniciadas por outros sites (proteção contra CSRF).

O navegador envia o cookie sozinho; com `curl`, use um arquivo de cookies (`-c cookies.txt` no login e
`-b cookies.txt` nas chamadas seguintes). As senhas são guardadas só como hash bcrypt, com no mínimo 8 caracteres. Um
e-mail inexistente e uma senha errada recebem a mesma resposta, para não revelar quais contas existem.

### Erros

Todos os erros seguem o formato `{ "error": "mensagem" }`; os de validação trazem também `details` por campo, por
exemplo `{ "error": "Validation failed", "details": { "title": ["Title is required"] } }`.

| Status | Quando                                                              | Exemplo de `error`         |
| ------ | ------------------------------------------------------------------- | -------------------------- |
| 400    | Dados inválidos (com `details` por campo)                           | `Validation failed`        |
| 400    | Corpo da requisição não é um JSON válido                            | `Malformed JSON body`      |
| 400    | Id da URL não é um inteiro positivo                                 | `Invalid task id`          |
| 401    | Sem sessão, sessão expirada ou credenciais inválidas                | `Authentication required`  |
| 404    | Tarefa não existe (ou é de outra pessoa)                            | `Task not found`           |
| 404    | Rota não existe                                                     | `Route not found: GET /x`  |
| 409    | E-mail já cadastrado                                                | `Email already registered` |
| 500    | Erro inesperado (detalhes só no log do servidor, nunca na resposta) | `Internal server error`    |

## Frontend

Angular 22 com componentes standalone e signals, sem zone.js. O frontend chama a API pelo caminho relativo `/api`;
em desenvolvimento, o servidor do Angular encaminha `/api` para `http://localhost:3000`
([`frontend/proxy.conf.json`](frontend/proxy.conf.json)). Se a API rodar em outra porta, ajuste o `target` desse
arquivo.

| Script           | O que faz                                                          |
| ---------------- | ------------------------------------------------------------------ |
| `npm start`      | Sobe o servidor de desenvolvimento em `http://localhost:4200`      |
| `npm run build`  | Gera a versão de produção em `dist/`                               |
| `npm test`       | Roda os testes de componentes e serviços (Vitest)                  |
| `npm run lint`   | Analisa o código e os templates com ESLint (inclui acessibilidade) |
| `npm run format` | Formata o código com Prettier                                      |

## Testes e qualidade

**Backend** — testes de integração com [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest):
cada teste faz requisições HTTP reais à API, que grava em bancos **separados** (`todo_test` no MySQL e no MongoDB) — os
dados de desenvolvimento nunca são tocados. Cobrem o CRUD, validações, autenticação (inclusive tokens adulterados,
expirados e sem assinatura), isolamento entre contas, detalhes e histórico.

```bash
docker compose up -d mysql mongo   # os dois bancos precisam estar no ar
cd backend
npm test
```

**Frontend** — testes de componentes, serviços, guards e interceptor com Vitest:

```bash
cd frontend
npm test
```

**Qualidade:** TypeScript em modo `strict` nos dois projetos, ESLint (com as regras de acessibilidade dos templates
Angular) e Prettier com uma configuração única para o repositório.

## Contribuindo

O `npm install` na raiz (o `npm start` faz isso sozinho) ativa dois hooks do Git, com [husky](https://typicode.github.io/husky/):

- **Antes do commit** ([lint-staged](https://github.com/lint-staged/lint-staged)): os arquivos alterados passam pelo
  Prettier e, se forem TypeScript ou templates, pelo ESLint do projeto a que pertencem. Formatação é corrigida
  sozinha; um erro de lint que não tem correção automática bloqueia o commit e mostra a linha.
- **Na mensagem do commit** ([commitlint](https://commitlint.js.org/)): ela precisa seguir o padrão
  [Conventional Commits](https://www.conventionalcommits.org/) em **uma linha só** — `tipo(escopo): descrição`, com
  tipo em minúsculas (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `style`...) e descrição sem ponto
  final. Exemplo: `feat(frontend): add dark mode`. Mensagens fora do padrão, com corpo ou com rodapé são recusadas.

## Problemas comuns

| Sintoma                                                             | O que fazer                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm start` diz que o Docker não está respondendo                   | Abra o Docker Desktop, espere ele terminar de iniciar e rode de novo                                                           |
| Erro de porta ocupada (3306, 27017, 3000, 4200 ou 8080)             | Outro programa usa a porta: feche-o, ou mude `MYSQL_PORT`/`MONGO_PORT`/`WEB_PORT` no `.env` da raiz e `PORT` no `backend/.env` |
| Opção 1 e opção 2 ao mesmo tempo                                    | Use uma de cada vez: as duas usam os mesmos bancos e as portas 3306 e 27017                                                    |
| A API não sobe: "Missing required environment variables"            | Crie o `backend/.env` a partir do `backend/.env.example`                                                                       |
| A API não sobe: "API failed to start: MongooseServerSelectionError" | O MongoDB não está no ar: `docker compose up -d mysql mongo` e confira `docker compose ps`                                     |
| A tela mostra "Sem conexão com o servidor"                          | A API está parada: suba o backend (`npm run dev` em `backend/`)                                                                |
| Testes do backend: "Could not prepare the test database"            | O volume do MySQL é anterior ao script do banco de testes: `docker compose down -v` e `docker compose up -d mysql mongo`       |
| Não consigo entrar com o usuário demo                               | Rode `npm run seed` em `backend/` (é seguro rodar mais de uma vez)                                                             |
