# TechX Tasks

Aplicação web de gerenciamento de tarefas (to-do list) desenvolvida para o desafio Full Stack da Essentia Group.

- **Frontend:** Angular
- **Backend:** API RESTful em Node.js + TypeScript
- **Bancos de dados:** MySQL (tarefas e usuários) e MongoDB (informações adicionais das tarefas)

> **Usuário de demonstração:** `demo@techx.com` / `demo12345` — já vem com algumas tarefas (criado pelo
> `npm run seed`, que o `npm start` roda sozinho).

## Funcionalidades

- **Página inicial com todas as tarefas cadastradas** da pessoa conectada, das mais recentes para as mais antigas, com
  título, descrição e situação (pendente ou concluída), e um resumo com o total, as pendentes e as concluídas. Cada
  pessoa vê e altera só as próprias tarefas; sem login, a página leva à tela de entrada.
- **Cadastro e login:** telas `/register` e `/login` (link "Entrar" no cabeçalho). O cadastro já entra na conta; depois
  do login, o cabeçalho mostra o e-mail de quem está conectado e a sessão continua ao recarregar a página. A sessão fica
  num cookie que os scripts da página não conseguem ler — nada é guardado no `localStorage`.
- **Sair e sessão expirada:** o botão "Sair" no cabeçalho encerra a sessão. Se a sessão expirar com a página aberta, a
  próxima ação leva à tela de entrada com o aviso "Sua sessão expirou". Quem já está conectado e abre `/login` ou
  `/register` vai direto para as tarefas.
- **Layout responsivo:** funciona do celular (360 px) ao desktop, sem rolagem horizontal, com foco visível para quem
  navega pelo teclado.
- **Criar tarefa:** formulário com título (obrigatório) e descrição (opcional); a nova tarefa aparece no topo da lista e
  o formulário é limpo. Título em branco não é enviado e mostra uma mensagem de erro no campo.
- **Editar tarefa:** o botão "Editar" abre o título e a descrição para edição dentro da própria lista; "Salvar" grava,
  "Cancelar" (ou a tecla Esc) descarta. O foco do teclado vai para o campo ao abrir e volta ao botão ao fechar.
- **Excluir tarefa:** o botão "Excluir" pede confirmação com o nome da tarefa antes de apagar.
- **Carregamento, lista vazia e erros:** mensagem enquanto as tarefas carregam e quando ainda não há nenhuma; se a API
  não responder, a lista mostra o erro com o botão "Tentar novamente". Quando criar, editar, concluir ou excluir
  falhar, um aviso no topo da página explica o que aconteceu (inclusive "sem conexão com o servidor") e nada do que foi
  digitado se perde; uma tarefa que já não existe no servidor sai da lista.
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
3. Aplica as migrations pendentes do banco e garante o usuário de demonstração (`npm run seed`).
4. Abre o backend em uma nova aba do terminal (Windows Terminal; sem ele, em uma nova janela do PowerShell) e espera a
   API responder em `/api/health` (até 60 s).
5. Só então abre o frontend em outra aba e espera ele responder em `http://localhost:4200` (até 120 s).
6. Devolve o foco ao terminal onde o comando foi digitado. A aplicação fica em **http://localhost:4200**.

Se algum passo falhar, o script para e diz o que verificar. Em outros sistemas operacionais, siga o passo a passo
das seções abaixo.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (com Docker Compose v2)
- [Node.js](https://nodejs.org/) 22 ou superior (com npm)

## Bancos de dados

Os dois bancos rodam em containers Docker:

- **MySQL 8.4** — usuários e tarefas (dados estruturados, com relacionamento entre si);
- **MongoDB 8.0** — informações adicionais das tarefas (documentos sem esquema fixo).

```bash
docker compose up -d
```

Os containers ficam prontos quando `docker compose ps` mostra o status `healthy` nos dois.

Os valores padrão funcionam sem configuração: MySQL com banco, usuário e senha `todo` na porta `3306`; MongoDB com
usuário e senha `todo` na porta `27017`. Para alterá-los, copie `.env.example` para `.env` e edite as variáveis.

Para parar: `docker compose down` (os dados ficam nos volumes `mysql-data` e `mongo-data`; use `docker compose down -v`
para apagá-los).

## Backend

API REST em Node.js + TypeScript com Express.

```bash
cd backend
npm install
cp .env.example .env   # no PowerShell: Copy-Item .env.example .env
npm run migrate        # cria/atualiza as tabelas no MySQL
npm run seed           # cria o usuário de demonstração (demo@techx.com / demo12345)
npm run dev            # http://localhost:3000, recarrega a cada alteração
```

Se o `.env` estiver faltando, a API não sobe e informa quais variáveis precisam ser definidas.

#### Variáveis de ambiente (`backend/.env`)

| Variável         | Obrigatória | Padrão                  | Descrição                                                     |
| ---------------- | ----------- | ----------------------- | ------------------------------------------------------------- |
| `PORT`           | não         | `3000`                  | Porta HTTP da API                                             |
| `CORS_ORIGIN`    | não         | `http://localhost:4200` | Origem do navegador autorizada a chamar a API (CORS)          |
| `DB_HOST`        | sim         | —                       | Host do MySQL                                                 |
| `DB_PORT`        | não         | `3306`                  | Porta do MySQL                                                |
| `DB_USER`        | sim         | —                       | Usuário do MySQL                                              |
| `DB_PASSWORD`    | sim         | —                       | Senha do MySQL                                                |
| `DB_NAME`        | sim         | —                       | Nome do banco                                                 |
| `MONGO_URL`      | sim         | —                       | Endereço do MongoDB, com usuário e senha                      |
| `MONGO_DB_NAME`  | não         | `todo`                  | Nome do banco no MongoDB                                      |
| `JWT_SECRET`     | sim         | —                       | Segredo que assina os tokens de sessão (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | não         | `8h`                    | Duração da sessão (`30m`, `8h`, `7d`...)                      |

O `.env.example` já traz valores que funcionam com o MySQL do `docker-compose.yml`.

| Script            | O que faz                                                                         |
| ----------------- | --------------------------------------------------------------------------------- |
| `npm run dev`     | Sobe a API em modo de desenvolvimento (hot reload)                                |
| `npm run build`   | Compila o TypeScript para `dist/`                                                 |
| `npm start`       | Sobe a versão compilada                                                           |
| `npm run migrate` | Aplica as migrations pendentes                                                    |
| `npm run seed`    | Cria o usuário demo com tarefas de exemplo (pode rodar de novo sem duplicar nada) |
| `npm test`        | Roda os testes de integração (banco `todo_test`)                                  |
| `npm run lint`    | Analisa o código com ESLint                                                       |
| `npm run format`  | Formata o código com Prettier                                                     |

Para conferir se a API está no ar: `GET http://localhost:3000/api/health` →
`200 { "status": "ok", "mysql": "ok", "mongo": "ok" }`. Se um dos bancos estiver fora do ar, a resposta é `503` e diz
qual (ex.: `{ "status": "error", "mysql": "ok", "mongo": "unavailable" }`). A API não sobe se não conseguir conectar ao
MongoDB, e se reconecta sozinha quando ele volta.

### Endpoints

Todas as rotas ficam sob o prefixo `/api`. As rotas de **tarefas exigem sessão** (sem ela: `401`) e só enxergam as
tarefas da pessoa conectada — a tarefa de outra pessoa responde `404`, como se não existisse.

| Método | Rota             | Descrição                                                                 | Sucesso |
| ------ | ---------------- | ------------------------------------------------------------------------- | ------- |
| GET    | `/health`        | Situação da API e dos dois bancos                                         | 200     |
| GET    | `/tasks`         | Lista todas as tarefas, das mais recentes para as antigas                 | 200     |
| POST   | `/tasks`         | Cria uma tarefa                                                           | 201     |
| GET    | `/tasks/:id`     | Busca uma tarefa pelo id                                                  | 200     |
| PATCH  | `/tasks/:id`     | Atualiza parcialmente uma tarefa (inclui marcar/desmarcar como concluída) | 200     |
| DELETE | `/tasks/:id`     | Exclui uma tarefa (resposta sem corpo)                                    | 204     |
| POST   | `/auth/register` | Cria a conta e já inicia a sessão                                         | 201     |
| POST   | `/auth/login`    | Inicia a sessão                                                           | 200     |
| GET    | `/auth/me`       | Usuário da sessão atual                                                   | 200     |
| POST   | `/auth/logout`   | Encerra a sessão (resposta sem corpo)                                     | 204     |

#### Autenticação

O login e o cadastro respondem `{ "user": { "id": 1, "email": "ana@techx.com" } }` e guardam a sessão (um JWT assinado
com HS256) num **cookie `HttpOnly`, `SameSite=Strict`**, restrito ao caminho `/api` e com `Secure` em produção:

- `HttpOnly`: scripts da página não conseguem ler o token, então um ataque XSS não rouba a sessão;
- `SameSite=Strict`: o navegador não envia o cookie em requisições iniciadas por outros sites (proteção contra CSRF).

O navegador envia o cookie sozinho; com `curl`, use um arquivo de cookies (`-c cookies.txt` no login e
`-b cookies.txt` nas chamadas seguintes). As senhas são guardadas só como hash bcrypt (custo 12), com 8 caracteres no
mínimo. Um e-mail inexistente e uma senha errada recebem a mesma resposta (`401 Invalid email or password`), para não
revelar quais contas existem.

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

Além dos erros abaixo, as rotas de autenticação respondem `401` (sem sessão ou credenciais inválidas) e `409` (e-mail
já cadastrado).

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
requisições HTTP reais à API, que grava em bancos **separados**, o `todo_test` no MySQL e no MongoDB — os dados de
desenvolvimento (`todo`) nunca são tocados. As migrations são aplicadas no banco de teste antes da suíte, e as tabelas
são limpas antes de cada teste. Os dois containers precisam estar no ar (`docker compose up -d`).

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
