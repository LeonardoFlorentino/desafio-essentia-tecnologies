# 0001 — Express + `mysql2` com SQL escrito à mão, sem ORM

**Status:** aceita

## Contexto

O desafio pede uma API RESTful em Node.js + TypeScript com MySQL. O domínio é pequeno (contas e tarefas) e as consultas
são poucas, mas a avaliação olha a qualidade do código e a segurança: injeção de SQL e acesso a dados de outra conta
precisam ser impossíveis por construção, e o SQL precisa ser legível para quem revisa.

## Decisão

- **Express 5** como framework HTTP: pouca estrutura imposta, e erros de rotas `async` chegam sozinhos ao tratador
  central (`app.use(errorHandler)`).
- **`mysql2`** com **SQL escrito à mão e sempre parametrizado** (`?`). Os únicos trechos montados em código são
  identificadores vindos de **listas fixas** (colunas, `ORDER BY`, campos do `UPDATE`), nunca da requisição.
- **Toda consulta de tarefa filtra pelo dono** (`WHERE ... AND user_id = ?`): tarefa de outra conta se comporta como
  inexistente (404).
- **zod** valida cada entrada na fronteira (corpo e query string) e gera os tipos TypeScript.
- **Migrations em SQL numerado** (`001`…`005`) com um runner próprio de ~40 linhas, que aplica em ordem o que falta e
  registra numa tabela `migrations`.

## Consequências

- **+** O SQL de cada operação está à vista no repositório, e a segurança é verificável lendo um arquivo.
- **+** Sem camada de abstração para aprender ou depurar; dependências mínimas.
- **−** Mapear linhas para objetos (`snake_case` → `camelCase`, `TINYINT` → `boolean`) é manual (`toTask`).
- **−** Sem geração automática de migrations: cada mudança de esquema é um arquivo SQL escrito à mão. MySQL faz DDL com
  commit implícito, então uma migration que falha no meio precisa de correção manual.

**Alternativas descartadas:** Prisma/TypeORM/Sequelize (escondem o SQL e trazem conceitos — sessões, entidades, schema
próprio — que o tamanho do domínio não pede); NestJS (estrutura demais para uma API de três recursos).

## Onde está

- [`backend/src/app.ts`](../../backend/src/app.ts) — montagem do Express e do tratador de erros.
- [`backend/src/tasks/task.repository.ts`](../../backend/src/tasks/task.repository.ts) — SQL das tarefas, `ORDER_BY`,
  `UPDATABLE`, `escapeLike` e o filtro por dono.
- [`backend/src/tasks/task.schemas.ts`](../../backend/src/tasks/task.schemas.ts) — validação com zod.
- [`backend/src/db/mysql.ts`](../../backend/src/db/mysql.ts) — pool de conexões.
- [`backend/src/db/migrate.ts`](../../backend/src/db/migrate.ts) e [`backend/migrations/`](../../backend/migrations) —
  runner e arquivos de migration.
- [`backend/tests/integration/security-regression.test.ts`](../../backend/tests/integration/security-regression.test.ts)
  — prova de que injeção e acesso entre contas falham.
