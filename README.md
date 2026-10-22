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
- [Segurança](#segurança)
- [Operação](#operação)
- [Testes e qualidade](#testes-e-qualidade)
- [Contribuindo](#contribuindo)
- [Problemas comuns](#problemas-comuns)

## Funcionalidades

- **Página inicial com todas as tarefas cadastradas** da pessoa conectada, das mais recentes para as mais antigas, com
  título, descrição, situação, prioridade e prazo, e um resumo com o total, as pendentes e as concluídas.
- **Criar tarefa:** título (obrigatório), descrição, prazo (opcionais) e prioridade (baixa, média ou alta; média por
  padrão); a nova tarefa aparece no topo da lista.
- **Editar tarefa:** "Editar" abre todos os campos dentro da própria lista; "Salvar" grava, "Cancelar" ou Esc
  descarta.
- **Prazos:** tarefa pendente com prazo vencido aparece como **Atrasada** (com uma barra vermelha na lateral) e a do
  dia como **Vence hoje**, conforme a data do computador de quem usa.
- **Campo de data em português:** o prazo é digitado no formato dia/mês/ano (`__/__/____`, as barras entram sozinhas)
  ou escolhido num calendário próprio, em português, com a semana começando no domingo e os botões "Hoje", "Limpar" e
  "Fechar". Esc ou um clique fora fecham o calendário, e uma data impossível (31/02) não é aceita. O campo nativo do
  navegador foi substituído porque segue o idioma do sistema e, em muitas máquinas, mostra o calendário em inglês e a
  data como mês/dia/ano.
- **Busca, filtros e ordenação:** busca no título e na descrição (dispara após uma pausa na digitação), filtros por
  situação e prioridade, e ordenação por mais recentes, prazo mais próximo (sem prazo por último) ou maior prioridade.
  Tudo fica no endereço da página (ex.: `/?status=pending&sort=due_date`): recarregar ou compartilhar o link mantém a
  mesma lista. Sem resultados, um botão limpa os filtros; uma tarefa nova que os filtros escondem gera um aviso.
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
- Site e bancos ficam acessíveis **só neste computador** (`127.0.0.1`), já que as senhas padrão estão neste README.
- Sem `JWT_SECRET` definido, a API sorteia um segredo a cada início (as sessões caem ao reiniciar o container). O
  usuário de demonstração existe porque o compose liga `SEED_DEMO_USER=true`; a imagem, sozinha, não o cria.
- Para mudar a porta ou fixar o segredo da sessão, copie o `.env.example` da raiz para `.env` (`WEB_PORT`,
  `JWT_SECRET`).

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

| O quê               | Opção 1 (Docker)                       | Opção 2 (desenvolvimento)              |
| ------------------- | -------------------------------------- | -------------------------------------- |
| Aplicação           | http://localhost:8080                  | http://localhost:4200                  |
| API                 | http://localhost:8080/api              | http://localhost:3000/api              |
| Situação da API     | http://localhost:8080/api/health/ready | http://localhost:3000/api/health/ready |
| Documentação da API | http://localhost:8080/api/docs         | http://localhost:3000/api/docs         |
| MySQL / MongoDB     | `localhost:3306` / `localhost:27017`   | `localhost:3306` / `localhost:27017`   |

### Para parar

`docker compose down` (na opção 2, feche também as abas do backend e do frontend). Os dados ficam nos volumes
`mysql-data` e `mongo-data`, compartilhados pelas duas opções; `docker compose down -v` apaga tudo (o usuário de
demonstração é recriado na próxima subida).

## Estrutura do projeto

```
├── backend/
│   ├── migrations/          Esquema do MySQL em SQL numerado (001 a 005)
│   ├── src/
│   │   ├── auth/            Cadastro, login, sessão (JWT em cookie) e usuários
│   │   ├── db/              Conexões (MySQL, MongoDB), migrations e seed
│   │   ├── http/            Erros, health checks e documentação (Swagger)
│   │   ├── tasks/           Rotas, validação, MySQL (tarefas) e MongoDB (detalhes e histórico)
│   │   ├── app.ts           Monta a aplicação Express
│   │   ├── logger.ts        Logs em JSON (pino) e campos que nunca são registrados
│   │   └── server.ts        Conecta ao MongoDB e abre a porta
│   └── tests/               unit/ (sem banco, com mocks) e integration/ (API contra bancos de teste)
├── frontend/src/app/
│   ├── auth/                Login, cadastro, guards e tratamento de sessão expirada
│   ├── tasks/               Página de tarefas, cartão, painel de detalhes, serviço da API
│   └── shared/              Campo de data (dd/mm/aaaa + calendário), datas e erros HTTP
├── docker/mysql-init/       Cria o banco de testes do MySQL
├── e2e/                     Testes de ponta a ponta (Playwright)
├── docker-compose.yml       MySQL, MongoDB, API e site (nginx)
└── start.ps1                Inicialização com um comando (npm start)
```

## Backend

Se o `backend/.env` estiver faltando ou incompleto, a API não sobe e informa quais variáveis precisam ser definidas.

| Variável                   | Obrigatória | Padrão                  | Descrição                                                                 |
| -------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------- |
| `PORT`                     | não         | `3000`                  | Porta HTTP da API                                                         |
| `CORS_ORIGIN`              | não         | `http://localhost:4200` | Origem do navegador autorizada a chamar a API diretamente                 |
| `DB_HOST`                  | sim         | —                       | Host do MySQL                                                             |
| `DB_PORT`                  | não         | `3306`                  | Porta do MySQL                                                            |
| `DB_USER`                  | sim         | —                       | Usuário do MySQL                                                          |
| `DB_PASSWORD`              | sim         | —                       | Senha do MySQL                                                            |
| `DB_NAME`                  | sim         | —                       | Nome do banco no MySQL                                                    |
| `MONGO_URL`                | sim         | —                       | Endereço do MongoDB, com usuário e senha                                  |
| `MONGO_DB_NAME`            | não         | `todo`                  | Nome do banco no MongoDB                                                  |
| `JWT_SECRET`               | sim         | —                       | Segredo que assina os tokens de sessão (mínimo 32 caracteres)             |
| `JWT_EXPIRES_IN`           | não         | `8h`                    | Duração da sessão (`30m`, `8h`, `7d`...)                                  |
| `COOKIE_SECURE`            | não         | `true` em produção      | Cookie de sessão só por HTTPS (`false` no Docker local, servido por HTTP) |
| `AUTH_ATTEMPTS_PER_MINUTE` | não         | `5`                     | Falhas de login e cadastros aceitos por IP a cada minuto (depois, `429`)  |
| `TRUST_PROXY`              | não         | `0`                     | Quantos proxies há na frente da API (`1` no Docker, por causa do nginx)   |
| `LOG_LEVEL`                | não         | `info`                  | Detalhe dos logs: `debug`, `info`, `warn`, `error` ou `silent`            |

O `backend/.env.example` já traz valores que funcionam com o `docker-compose.yml`.

| Script            | O que faz                                                                           |
| ----------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`     | Sobe a API em modo de desenvolvimento (recarrega a cada alteração)                  |
| `npm run build`   | Compila o TypeScript para `dist/`                                                   |
| `npm start`       | Sobe a versão compilada                                                             |
| `npm run migrate` | Aplica as migrations pendentes                                                      |
| `npm run seed`    | Cria o usuário demo com tarefas de exemplo (pode rodar de novo sem duplicar nada)   |
| `npm test`        | Roda os testes unitários e de integração (`test:unit`, `test:int`, `test:coverage`) |
| `npm run lint`    | Analisa o código com ESLint e valida o documento OpenAPI                            |
| `npm run format`  | Formata o código com Prettier                                                       |

**Situação da API:** veja [Operação](#operação). A API não sobe sem conseguir conectar ao MongoDB e se reconecta
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
| GET    | `/health/live`       | O processo da API está de pé (não consulta os bancos)                     | 200     |
| GET    | `/health/ready`      | MySQL e MongoDB respondendo (`/health` é o mesmo)                         | 200     |
| POST   | `/auth/register`     | Cria a conta e já inicia a sessão                                         | 201     |
| POST   | `/auth/login`        | Inicia a sessão                                                           | 200     |
| GET    | `/auth/me`           | Usuário da sessão atual                                                   | 200     |
| POST   | `/auth/logout`       | Encerra a sessão e revoga o token no servidor (resposta sem corpo)        | 204     |
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

| Script                  | O que faz                                                             |
| ----------------------- | --------------------------------------------------------------------- |
| `npm start`             | Sobe o servidor de desenvolvimento em `http://localhost:4200`         |
| `npm run build`         | Gera a versão de produção em `dist/`                                  |
| `npm test`              | Roda os testes de componentes e serviços (Vitest), em modo observação |
| `npm run test:coverage` | Roda os testes uma vez, com cobertura mínima de 90% das linhas        |
| `npm run lint`          | Analisa o código e os templates com ESLint (inclui acessibilidade)    |
| `npm run format`        | Formata o código com Prettier                                         |

## Segurança

**Headers HTTP.** A API usa o [helmet](https://helmetjs.github.io/) e não se identifica (sem `X-Powered-By`). Como ela
só responde JSON, a política de conteúdo é a mais restrita possível: `Content-Security-Policy: default-src 'none';
frame-ancestors 'none'` — a resposta não carrega nada e não pode ser exibida dentro de outra página. A documentação
(`/api/docs`) tem uma política própria: só scripts, estilos e imagens da própria API, nada de outros sites.

O nginx que serve o site (Docker) envia, nas páginas e nos arquivos, os headers de
[`frontend/security-headers.conf`](frontend/security-headers.conf) e esconde a própria versão:

| Header                         | Efeito                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `Content-Security-Policy`      | Scripts e estilos só do próprio site; bloqueia script injetado ou de outro domínio |
| `X-Frame-Options: DENY`        | A página não pode ser embutida em outro site (contra clickjacking)                 |
| `X-Content-Type-Options`       | O navegador não "adivinha" o tipo de um arquivo                                    |
| `Referrer-Policy: no-referrer` | O endereço da página (com filtros e busca) não vaza para outros sites              |
| `Permissions-Policy`           | Câmera, microfone, localização e pagamento desligados                              |

O build de produção do Angular não tem nenhum script embutido no HTML (a otimização que inlinava o CSS crítico, e
precisava de um, foi desligada no `angular.json`), por isso a política pode exigir `script-src 'self'` sem exceções.

**Limite das requisições.** Corpos JSON acima de **100 kB** são recusados com `413 { "error": "Request body too large" }`
antes de qualquer processamento. O maior corpo válido (10.000 caracteres de notas) fica bem abaixo disso.

**CORS.** Só a origem configurada em `CORS_ORIGIN` pode chamar a API a partir de um navegador; qualquer outra não recebe
permissão. No uso normal nem é preciso: página e API ficam na mesma origem.

**Limite de tentativas (força bruta).** Por endereço IP, a cada minuto:

- **Login:** 5 tentativas **que falharem**; a 6ª responde `429` (com `Retry-After` dizendo em quantos segundos tentar
  de novo) — até com a senha certa, para que ninguém continue testando senhas durante o bloqueio. Logins que dão certo
  não contam, então quem acerta a senha nunca é bloqueado. A tela mostra "Muitas tentativas seguidas. Aguarde um
  minuto e tente novamente."
- **Cadastro:** 5 contas novas; a 6ª responde `429`.

No Docker, a API só recebe requisições pelo nginx e usa o IP do navegador que ele informa (`TRUST_PROXY=1`); sem isso,
todos os usuários dividiriam o mesmo limite. Um `X-Forwarded-For` forjado pelo cliente não adianta: vale só o endereço
acrescentado pelo nginx. Os contadores ficam na memória da API (zeram ao reiniciar; com mais de uma instância da API,
seria preciso um armazenamento compartilhado, como Redis).

**Senhas.** No mínimo 8 caracteres e no máximo 72 bytes (o limite do bcrypt — acima disso, o resto seria ignorado sem
aviso), guardadas com bcrypt (custo 12). O login responde a mesma mensagem, "e-mail ou senha inválidos", para e-mail
inexistente e para senha errada, e leva o mesmo tempo nos dois casos (compara com um hash fictício quando o e-mail não
existe): nem a resposta nem a demora revelam quais e-mails têm conta.

**Logout de verdade.** Um JWT costuma valer até expirar, mesmo depois do "Sair" — apagar o cookie só limpa o navegador.
Aqui cada token tem um id único (`jti`), e o logout grava esse id na tabela `revoked_tokens` do MySQL (migration
`005`); toda rota protegida confere a tabela, então **uma cópia do token** (roubada ou guardada por um script) passa a
receber `401` na hora. Só aquela sessão acaba: a mesma conta aberta em outro navegador continua conectada. Cada linha
guarda quando o token expiraria; depois disso ela não serve para mais nada e é apagada sempre que a API inicia.

**Auditoria (OWASP Top 10).** O projeto foi revisado categoria por categoria. O que foi conferido:

- **Acesso:** toda consulta, no MySQL e no MongoDB, filtra pelo dono da tarefa.
- **Injeção:** o SQL é sempre parametrizado; colunas e ordenação vêm de listas fixas. O MongoDB só recebe valores já
  validados, e o Angular escapa tudo o que exibe.
- **Erros:** um erro inesperado responde só `Internal server error`, sem stack nem SQL.
- **Segredos:** a API recusa subir em produção com os segredos de exemplo deste repositório.
- **Containers:** rodam sem usuário root, e os bancos ficam acessíveis só localmente.
- **Usuário de demonstração:** só é criado quando pedido.

`npm audit` sai sem vulnerabilidades no backend, no frontend e na raiz, inclusive nas dependências de
desenvolvimento.

## Operação

**Health checks.** Duas perguntas diferentes, duas rotas:

| Rota                    | Pergunta                                    | Resposta                                                              |
| ----------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/health/live`  | O processo está de pé?                      | Sempre `200 { "status": "ok" }` enquanto a API responde               |
| `GET /api/health/ready` | Dá para atender requisições (bancos no ar)? | `200`, ou `503` dizendo qual banco caiu: `{ "mongo": "unavailable" }` |

A separação evita reinícios inúteis: se o MongoDB cair, a API continua _viva_ (reiniciá-la não traria o banco de volta)
e só deixa de estar _pronta_. O Docker Compose e o `npm start` esperam pelo `ready` antes de seguir. `/api/health`, o
endereço original, responde o mesmo que o `ready`.

**Logs.** A API escreve uma linha JSON por requisição ([pino](https://getpino.io/)), com método, endereço, status,
tempo de resposta, IP e um **id da requisição**. Esse id volta no header `X-Request-Id` e, num erro inesperado, também
no corpo:

```json
{ "error": "Internal server error", "requestId": "507fde5a-d6f7-4ee3-ac0d-2864890200f3" }
```

Com o id que a pessoa informar, todas as linhas daquela requisição aparecem no log, inclusive o erro completo. Se um
proxy já mandar um `X-Request-Id`, ele é aproveitado.

- **Em desenvolvimento** (`npm run dev`), os logs passam pelo `pino-pretty` e aparecem coloridos e legíveis no
  terminal.
- **No Docker**, saem em JSON, uma linha por evento, prontos para uma ferramenta de logs. Para acompanhar:
  `docker compose logs -f api`. Para filtrar uma requisição: `docker compose logs api | grep <requestId>`.
- **Eventos de segurança** têm o campo `event`: `auth.login_failed` (aviso), `auth.rate_limited` (aviso),
  `auth.login`, `auth.register` e `auth.logout`. Uma falha de login registra o IP, não o e-mail digitado.
- **Nunca vão para o log:** senhas, o cookie de sessão, o header `Authorization` e o SQL dos erros do banco, que traz
  os valores da consulta. Esses campos aparecem como `[redacted]`.
- As consultas de health check não são registradas, porque o Docker as faz a cada poucos segundos.

## Testes e qualidade

**Backend** — [Jest](https://jestjs.io/), em duas suítes:

- **Unitários** (`tests/unit`, poucos segundos, sem banco): cada módulo é testado com as dependências trocadas por
  mocks. Cobrem as regras de validação (zod), o hash de senha e o token, o `requireAuth`, o tratamento de erros, a
  montagem do SQL da lista (filtros, busca, ordenação), o runner de migrations e as falhas "toleradas" (histórico no
  MongoDB, e-mail repetido).
- **Integração** (`tests/integration`, com [Supertest](https://github.com/ladjs/supertest)): requisições HTTP reais à
  API, que grava em bancos **separados** (`todo_test` no MySQL e no MongoDB). Os dados de desenvolvimento nunca são
  tocados. Cobrem o CRUD, validações, autenticação, isolamento entre contas, filtros, detalhes, histórico, logs e
  health checks.

| Script                  | O que roda                                                 |
| ----------------------- | ---------------------------------------------------------- |
| `npm test`              | As duas suítes                                             |
| `npm run test:unit`     | Só os unitários (não precisa de banco)                     |
| `npm run test:int`      | Só os de integração                                        |
| `npm run test:coverage` | As duas, com relatório de cobertura em `backend/coverage/` |

O `test:coverage` **falha** abaixo de **90% das linhas** (e de 90% das funções e instruções, 80% dos desvios). Todo o
`src/` entra na conta, inclusive arquivos que nenhum teste carrega; só o `server.ts`, que apenas abre a porta, fica de
fora. Hoje: cerca de 98% das linhas.

**Testes de regressão de segurança** — [`security-regression.test.ts`](backend/tests/integration/security-regression.test.ts)
reúne os ataques que a API precisa continuar barrando, organizados pelas categorias do OWASP Top 10:

| Ataque                                                                                               | Resultado esperado                |
| ---------------------------------------------------------------------------------------------------- | --------------------------------- |
| Outra conta lê, edita ou exclui a tarefa, as notas/tags ou o histórico (IDOR)                        | `404`, e nada muda                |
| Outra conta procura as tarefas pela lista, busca ou filtros                                          | não aparecem                      |
| `userId`/`id` no corpo para criar tarefa em nome de outra pessoa                                     | ignorados                         |
| Token com payload trocado, outro segredo, expirado, `alg: none`, outro algoritmo, sem id ou revogado | `401`                             |
| SQL injection no título, na descrição e na busca                                                     | salvo e buscado como texto comum  |
| Injeção em `sort`/`order`/`status` ou no id da URL                                                   | `400`                             |
| Operadores do MongoDB (`$ne`, `$gt`, `$set`) nas notas e tags                                        | `400` ou descartados              |
| `__proto__` no JSON (prototype pollution)                                                            | sem efeito                        |
| HTML/script no título                                                                                | devolvido como texto JSON         |
| Falha do banco                                                                                       | `500` genérico, sem SQL nem stack |

Cada caso de token parte de um token **válido** com um único defeito, e um teste de controle confirma que o token sem
defeito é aceito. Assim, o teste só passa se aquela verificação específica funcionar. Os limites de tentativas (`429`), os
headers de segurança, o corpo grande (`413`), o CORS e o logout têm arquivos próprios (`rate-limit`, `security`,
`token-revocation`).

```bash
docker compose up -d mysql mongo   # os dois bancos precisam estar no ar
cd backend
npm test
```

**Frontend** — executor de testes do Angular (`ng test`, com Vitest), `TestBed` e `HttpTestingController`: as
requisições à API são interceptadas, então nenhum teste depende do backend.

- **Página de tarefas:** carregar, criar, editar, concluir, excluir, filtros e busca na URL, tarefas atrasadas,
  estados de carregamento e de erro.
- **Cartão da tarefa** (isolado): mostra prioridade, prazo e "Atrasada"; só _avisa_ o que a pessoa fez (concluir,
  editar, salvar, excluir) e nunca chama a API.
- **Login e cadastro:** validação, envio, mensagens de 401, 409 e 429.
- **Rotas:** a tabela de rotas real: sem sessão, qualquer endereço leva ao login; com sessão, login e cadastro voltam
  para a lista.
- **Guards e interceptor:** sessão expirada (401) leva ao login com aviso.
- **Notas, tags, histórico e serviços.**

```bash
cd frontend
npm test                # modo observação (roda de novo a cada alteração)
npm run test:coverage   # uma vez, com cobertura
```

O `test:coverage` falha abaixo dos mesmos limites do backend (90% das linhas, funções e instruções; 80% dos desvios),
contando todo o `src/app`. Hoje: cerca de 98% das linhas.

**Ponta a ponta (E2E)** — [Playwright](https://playwright.dev/) em [`e2e/`](e2e), num Chromium de verdade, com a
aplicação inteira: o Playwright sobe a API e o Angular em **portas próprias** (3100 e 4300), ligados ao banco de testes
(`todo_test`). Então dá para rodar com os servidores de desenvolvimento abertos, e os dados de desenvolvimento nunca são
tocados. O banco de testes é esvaziado no início de cada execução, e cada teste cria a própria conta, então um teste
não vê as tarefas de outro.

```bash
docker compose up -d mysql mongo   # bancos no ar
npm install                        # na raiz (instala o Playwright)
npm run test:e2e:install           # uma vez: baixa o Chromium usado nos testes
npm run test:e2e
```

Cenários cobertos, sempre localizando os elementos pelo papel e pelo rótulo que um leitor de tela anunciaria (nunca por
classe CSS):

| Área                    | O que o teste faz na tela                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Primeiro acesso         | Visitante cai no login; cria a conta pelo formulário; lista vazia; primeira tarefa                |
| Criar                   | Título, descrição, prazo e prioridade aparecem no cartão; sem título, a mensagem explica          |
| Editar                  | Edição no próprio cartão (foco no título); "Salvar" grava; Esc descarta                           |
| Concluir                | Marca e desmarca; o resumo muda; continua marcada depois de recarregar a página                   |
| Excluir                 | Cancelar a confirmação mantém a tarefa; confirmar remove (também do servidor)                     |
| Prazos                  | "Atrasada" e "Vence hoje"; uma tarefa concluída nunca aparece como atrasada                       |
| Busca e filtros         | Situação, prioridade e busca; tudo na URL e mantido depois de recarregar; "Limpar filtros"        |
| Ordenação               | Por prazo (sem prazo por último) e por prioridade                                                 |
| Notas, tags e histórico | Salva no MongoDB (tags repetidas descartadas); edição aparece com o valor antes e depois          |
| Falhas da API           | Lista que não carrega mostra "Tentar novamente"; servidor fora do ar não apaga o que foi digitado |

A suíte passou 3 vezes seguidas e também com cada teste repetido 3 vezes (`--repeat-each=3`), sem falhas
intermitentes. Se um teste falhar, a captura de tela e o rastreamento (trace) ficam em `test-results/`.

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
