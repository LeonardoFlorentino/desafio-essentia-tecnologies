# TechX Tasks

Aplicação web de gerenciamento de tarefas (to-do list) desenvolvida para o desafio Full Stack da Essentia Group.

- **Frontend:** Angular
- **Backend:** API RESTful em Node.js + TypeScript
- **Banco de dados:** MySQL

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (com Docker Compose v2)

## Banco de dados

O MySQL 8.4 roda em um container Docker:

```bash
docker compose up -d
```

O container fica pronto quando `docker compose ps` mostra o status `healthy`.

Os valores padrão (banco `todo`, usuário `todo`, senha `todo`, porta `3306`) funcionam sem configuração.
Para alterá-los, copie `.env.example` para `.env` e edite as variáveis.

Para parar: `docker compose down` (os dados ficam no volume `mysql-data`; use `docker compose down -v` para apagá-los).
