# TechX Tasks

Aplicação web de gerenciamento de tarefas (to-do list) desenvolvida para o desafio Full Stack da Essentia Group.

- **Frontend:** Angular
- **Backend:** API RESTful em Node.js + TypeScript
- **Banco de dados:** MySQL

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
npm run dev            # http://localhost:3000, recarrega a cada alteração
```

Se o `.env` estiver faltando, a API não sobe e informa quais variáveis precisam ser definidas.

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe a API em modo de desenvolvimento (hot reload) |
| `npm run build` | Compila o TypeScript para `dist/` |
| `npm start` | Sobe a versão compilada |
| `npm run lint` | Analisa o código com ESLint |
| `npm run format` | Formata o código com Prettier |

Para conferir se a API está no ar: `GET http://localhost:3000/api/health` → `{ "status": "ok" }`.
