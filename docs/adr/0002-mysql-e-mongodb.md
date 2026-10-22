# 0002 — MySQL para tarefas e contas; MongoDB para notas e histórico

**Status:** aceita

## Contexto

O MySQL é obrigatório no desafio. O MongoDB é um extra opcional, "para armazenar informações adicionais das tarefas".
Usar os dois só faz sentido se cada um guardar o que combina com ele — e sem que um banco fora do ar derrube o outro.

## Decisão

- **MySQL** guarda o que tem relacionamento e regras fixas: **usuários**, **tarefas** (título, descrição, situação,
  prazo, prioridade, dono — com `FOREIGN KEY ... ON DELETE CASCADE`) e **tokens revogados**.
- **MongoDB** guarda o que tem formato livre ou só cresce:
  - `task_details` — **notas e tags** de uma tarefa (um documento por tarefa, criado só quando a pessoa preenche);
  - `task_events` — **histórico** (criada, editada com valor antes/depois, concluída, reaberta, notas alteradas,
    excluída). Cada evento tem um formato diferente, e a coleção só recebe inserções.
- O elo entre os dois é o **id da tarefa e o id do dono**, gravados em cada documento; toda consulta no MongoDB filtra
  pelos dois, como no MySQL.
- O **histórico é "melhor esforço"**: se o MongoDB falhar ao registrar um evento, a operação da tarefa (já salva no
  MySQL) não falha — o erro vai para o log.
- O health check de **prontidão** (`/api/health/ready`) exige os **dois** bancos; o de **vida** (`/api/health/live`)
  não consulta nenhum.

## Consequências

- **+** Cada banco faz o que faz bem; o esquema relacional fica enxuto, e o histórico não precisa de uma tabela
  "genérica" com colunas que quase nunca são usadas.
- **+** Os detalhes são carregados só quando o painel da tarefa abre (a lista nunca faz uma consulta por tarefa).
- **−** Não há transação entre os dois bancos: um evento do histórico pode se perder se o MongoDB cair no momento exato
  (aceito — o dado principal está no MySQL, e a falha é registrada).
- **−** Ao excluir uma tarefa, os detalhes são apagados em seguida no MongoDB, por código (não há `CASCADE` entre
  bancos).
- **−** Dois serviços a operar (dois backups, duas conexões, dois health checks).

**Alternativas descartadas:** só MySQL com colunas JSON (dispensaria o MongoDB, mas o extra pedido seria ignorado);
guardar a tarefa inteira no MongoDB (perderia as garantias relacionais que o desafio quer ver no MySQL).

## Onde está

- [`backend/migrations/`](../../backend/migrations) — tabelas `users`, `tasks`, `revoked_tokens`.
- [`backend/src/tasks/task-details.ts`](../../backend/src/tasks/task-details.ts) — coleção `task_details`.
- [`backend/src/tasks/task-history.ts`](../../backend/src/tasks/task-history.ts) — coleção `task_events` e
  `recordEvent` (melhor esforço).
- [`backend/src/tasks/task.routes.ts`](../../backend/src/tasks/task.routes.ts) — onde os eventos são registrados e os
  detalhes apagados junto com a tarefa.
- [`backend/src/http/health.ts`](../../backend/src/http/health.ts) — `live` e `ready`.
