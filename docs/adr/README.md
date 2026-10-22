# Registros de decisão de arquitetura (ADRs)

Cada arquivo registra uma decisão: o **contexto** que a motivou, a **decisão** tomada, as **consequências** (o que se
ganha e o que se paga) e as alternativas descartadas. A seção "Onde está" de cada um aponta os arquivos do repositório
em que a decisão aparece.

| #                                                  | Decisão                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| [0001](0001-express-e-sql-sem-orm.md)              | Express + `mysql2` com SQL escrito à mão, sem ORM                |
| [0002](0002-mysql-e-mongodb.md)                    | MySQL para tarefas e contas; MongoDB para notas e histórico      |
| [0003](0003-sessao-jwt-em-cookie-com-revogacao.md) | Sessão em JWT num cookie HttpOnly, com revogação no logout       |
| [0004](0004-prefixo-api-e-mesma-origem.md)         | Tudo sob `/api`, servido na mesma origem do site                 |
| [0005](0005-estrategia-de-testes.md)               | Jest (unitário + integração com banco real), Vitest e Playwright |
| [0006](0006-docker-multi-stage-e-nginx.md)         | Docker multi-stage, nginx servindo o site e o `/api`             |
| [0007](0007-deploy-render-aiven-atlas.md)          | Deploy gratuito: Render + Aiven (MySQL) + Atlas (MongoDB)        |

Uma decisão nova ganha o próximo número; uma decisão revista ganha um ADR novo que aponta o antigo (o antigo fica, com
o status "Substituída").
