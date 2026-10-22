# TechX Tasks

Aplicação web de gerenciamento de tarefas (to-do list) desenvolvida para o desafio Full Stack da Essentia Group.

- **Frontend:** Angular
- **Backend:** API RESTful em Node.js + TypeScript
- **Banco de dados:** MySQL

## Início rápido (Windows)

Com o Docker Desktop aberto, na raiz do projeto:

```bash
npm start
```

O comando prepara e sobe tudo, nesta ordem:

1. Na primeira execução, cria os arquivos `.env` a partir dos `.env.example` e instala as dependências do backend.
2. Sobe o MySQL e espera o container ficar saudável.
3. Aplica as migrations pendentes do banco.
4. Abre o backend em uma nova aba do terminal (Windows Terminal; sem ele, em uma nova janela do PowerShell).
5. Espera a API responder em `/api/health` (até 60 s) e devolve o foco ao terminal onde o comando foi digitado.

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

| Script            | O que faz                                          |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Sobe a API em modo de desenvolvimento (hot reload) |
| `npm run build`   | Compila o TypeScript para `dist/`                  |
| `npm start`       | Sobe a versão compilada                            |
| `npm run migrate` | Aplica as migrations pendentes                     |
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

Respostas de erro das rotas com `:id`: `400 { "error": "Invalid task id" }` quando o id não é um inteiro positivo e
`404 { "error": "Task not found" }` quando a tarefa não existe.

### Migrations

O esquema do banco é versionado em arquivos SQL numerados em `backend/migrations/` (`001_create_tasks.sql`, ...).
O `npm run migrate` aplica, em ordem, os arquivos que ainda não constam na tabela `migrations` do banco; rodar de novo
não faz nada se estiver tudo aplicado.
