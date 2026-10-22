# TechX Tasks

Aplicação web de gerenciamento de tarefas (to-do list) desenvolvida para o desafio Full Stack da Essentia Group.

- **Frontend:** Angular
- **Backend:** API RESTful em Node.js + TypeScript
- **Banco de dados:** MySQL

## Funcionalidades

- **Página inicial com todas as tarefas cadastradas**, das mais recentes para as mais antigas, com título, descrição e
  situação (pendente ou concluída).
- **Criar tarefa:** formulário com título (obrigatório) e descrição (opcional); a nova tarefa aparece no topo da lista e
  o formulário é limpo. Título em branco não é enviado e mostra uma mensagem de erro no campo.
- **Editar tarefa:** o botão "Editar" abre o título e a descrição para edição dentro da própria lista; "Salvar" grava,
  "Cancelar" (ou a tecla Esc) descarta. O foco do teclado vai para o campo ao abrir e volta ao botão ao fechar.
- **Marcar como concluída ou não:** uma caixa de seleção em cada tarefa; a concluída aparece riscada. Se a API recusar a
  mudança, a caixa volta ao estado salvo.

## Início rápido (Windows)

Com o Docker Desktop aberto, na raiz do projeto:

```bash
npm start
```

O comando prepara e sobe tudo, nesta ordem:

1. Na primeira execução, cria os arquivos `.env` a partir dos `.env.example` e instala as dependências do backend e
   do frontend.
2. Sobe o MySQL e espera o container ficar saudável.
3. Aplica as migrations pendentes do banco.
4. Abre o backend em uma nova aba do terminal (Windows Terminal; sem ele, em uma nova janela do PowerShell) e espera a
   API responder em `/api/health` (até 60 s).
5. Só então abre o frontend em outra aba e espera ele responder em `http://localhost:4200` (até 120 s).
6. Devolve o foco ao terminal onde o comando foi digitado. A aplicação fica em **http://localhost:4200**.

Se algum passo falhar, o script para e diz o que verificar. Em outros sistemas operacionais, siga o passo a passo
das seções abaixo.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (com Docker Compose v2)
- [Node.js](https://nodejs.org/) 22 ou superior (com npm)

## Banco de dados

O MySQL 8.4 roda em um container Docker:

```bash
docker compose up -d
```

O container fica pronto quando `docker compose ps` mostra o status `healthy`.

Os valores padrão (banco `todo`, usuário `todo`, senha `todo`, porta `3306`) funcionam sem configuração.
Para alterá-los, copie `.env.example` para `.env` e edite as variáveis.

Para parar: `docker compose down` (os dados ficam no volume `mysql-data`; use `docker compose down -v` para apagá-los).

## Backend

API REST em Node.js + TypeScript com Express.

```bash
cd backend
npm install
cp .env.example .env   # no PowerShell: Copy-Item .env.example .env
npm run migrate        # cria/atualiza as tabelas no MySQL
npm run dev            # http://localhost:3000, recarrega a cada alteração
```

Se o `.env` estiver faltando, a API não sobe e informa quais variáveis precisam ser definidas.

#### Variáveis de ambiente (`backend/.env`)

| Variável      | Obrigatória | Padrão                  | Descrição                                            |
| ------------- | ----------- | ----------------------- | ---------------------------------------------------- |
| `PORT`        | não         | `3000`                  | Porta HTTP da API                                    |
| `CORS_ORIGIN` | não         | `http://localhost:4200` | Origem do navegador autorizada a chamar a API (CORS) |
| `DB_HOST`     | sim         | —                       | Host do MySQL                                        |
| `DB_PORT`     | não         | `3306`                  | Porta do MySQL                                       |
| `DB_USER`     | sim         | —                       | Usuário do MySQL                                     |
| `DB_PASSWORD` | sim         | —                       | Senha do MySQL                                       |
| `DB_NAME`     | sim         | —                       | Nome do banco                                        |

O `.env.example` já traz valores que funcionam com o MySQL do `docker-compose.yml`.

| Script            | O que faz                                          |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Sobe a API em modo de desenvolvimento (hot reload) |
| `npm run build`   | Compila o TypeScript para `dist/`                  |
| `npm start`       | Sobe a versão compilada                            |
| `npm run migrate` | Aplica as migrations pendentes                     |
| `npm test`        | Roda os testes de integração (banco `todo_test`)   |
| `npm run lint`    | Analisa o código com ESLint                        |
| `npm run format`  | Formata o código com Prettier                      |

Para conferir se a API está no ar: `GET http://localhost:3000/api/health` → `200 { "status": "ok", "database": "ok" }`.
Se o MySQL estiver fora do ar, a resposta é `503 { "status": "error", "database": "unavailable" }`.

### Endpoints

Todas as rotas ficam sob o prefixo `/api`.

| Método | Rota         | Descrição                                                                 | Sucesso |
| ------ | ------------ | ------------------------------------------------------------------------- | ------- |
| GET    | `/health`    | Situação da API e do banco                                                | 200     |
| GET    | `/tasks`     | Lista todas as tarefas, das mais recentes para as antigas                 | 200     |
| POST   | `/tasks`     | Cria uma tarefa                                                           | 201     |
| GET    | `/tasks/:id` | Busca uma tarefa pelo id                                                  | 200     |
| PATCH  | `/tasks/:id` | Atualiza parcialmente uma tarefa (inclui marcar/desmarcar como concluída) | 200     |
| DELETE | `/tasks/:id` | Exclui uma tarefa (resposta sem corpo)                                    | 204     |

Exemplo de resposta de `GET /api/tasks`:

```json
[
  {
    "id": 1,
    "title": "Revisar o relatório",
    "description": "Conferir os números do trimestre",
    "completed": false,
    "createdAt": "2026-10-22T13:39:15.000Z",
    "updatedAt": "2026-10-22T13:39:15.000Z"
  }
]
```

Exemplo de `POST /api/tasks` (o `description` é opcional; vazio é salvo como `null`):

```json
{ "title": "Revisar o relatório", "description": "Conferir os números do trimestre" }
```

Resposta `201` com a tarefa criada (`completed: false`). Dados inválidos retornam `400` com o motivo por campo:

```json
{ "error": "Validation failed", "details": { "title": ["Title is required"] } }
```

| Campo         | Regras                                                          |
| ------------- | --------------------------------------------------------------- |
| `title`       | Obrigatório, texto, 1 a 255 caracteres (sem espaços nas pontas) |
| `description` | Opcional, texto, até 5000 caracteres                            |
| `completed`   | Só no `PATCH`: `true` ou `false`                                |

O `PATCH /api/tasks/:id` altera apenas os campos enviados (pelo menos um). Para marcar como concluída:

```json
{ "completed": true }
```

#### Erros

Todos os erros são respondidos em JSON, no formato `{ "error": "mensagem" }` (validação inclui também `details`):

| Status | Quando                                                              | Exemplo de `error`        |
| ------ | ------------------------------------------------------------------- | ------------------------- |
| 400    | Dados inválidos (com `details` por campo)                           | `Validation failed`       |
| 400    | Corpo da requisição não é um JSON válido                            | `Malformed JSON body`     |
| 400    | Id da URL não é um inteiro positivo                                 | `Invalid task id`         |
| 404    | Tarefa não existe                                                   | `Task not found`          |
| 404    | Rota não existe                                                     | `Route not found: GET /x` |
| 500    | Erro inesperado (detalhes só no log do servidor, nunca na resposta) | `Internal server error`   |

### Testes

Testes de integração com [Jest](https://jestjs.io/) + [Supertest](https://github.com/ladjs/supertest): cada teste faz
requisições HTTP reais à API, que grava num banco MySQL **separado**, o `todo_test` — os dados de desenvolvimento
(`todo`) nunca são tocados. As migrations são aplicadas no banco de teste antes da suíte, e a tabela é limpa antes de
cada teste.

```bash
docker compose up -d   # o MySQL precisa estar no ar
cd backend
npm test
```

O banco `todo_test` é criado automaticamente pelo script `docker/mysql-init/01-create-test-database.sh` quando o volume
do MySQL é criado. Se o seu volume é anterior a esse script, recrie-o com `docker compose down -v` (apaga os dados de
desenvolvimento) e `docker compose up -d`.

### Migrations

O esquema do banco é versionado em arquivos SQL numerados em `backend/migrations/` (`001_create_tasks.sql`, ...).
O `npm run migrate` aplica, em ordem, os arquivos que ainda não constam na tabela `migrations` do banco; rodar de novo
não faz nada se estiver tudo aplicado.

## Frontend

Interface em Angular 22 (componentes standalone, sem zone.js), com a API rodando em `http://localhost:3000`.

O frontend chama a API pelo caminho relativo `/api`. Em desenvolvimento, o servidor do Angular encaminha `/api` para
`http://localhost:3000` (configurado em `frontend/proxy.conf.json`), então a página e a API ficam na mesma origem e o
navegador não precisa de CORS. Se a API rodar em outra porta, ajuste o `target` desse arquivo.

```bash
cd frontend
npm install
npm start              # http://localhost:4200, recarrega a cada alteração
```

| Script           | O que faz                                                          |
| ---------------- | ------------------------------------------------------------------ |
| `npm start`      | Sobe o servidor de desenvolvimento em `http://localhost:4200`      |
| `npm run build`  | Gera a versão de produção em `dist/`                               |
| `npm test`       | Roda os testes unitários (Vitest)                                  |
| `npm run lint`   | Analisa o código e os templates com ESLint (inclui acessibilidade) |
| `npm run format` | Formata o código com Prettier                                      |
