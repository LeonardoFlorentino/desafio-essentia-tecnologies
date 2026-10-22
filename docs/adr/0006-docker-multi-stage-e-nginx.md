# 0006 — Docker multi-stage, nginx servindo o site e o `/api`

**Status:** aceita

## Contexto

Quem avalia o desafio precisa rodar o projeto inteiro sem instalar Node, MySQL nem MongoDB, com um comando só. E a
imagem que roda localmente deve ser a mesma que vai para o deploy.

## Decisão

- **`docker compose up --build`** sobe tudo, em ordem de dependência (bancos saudáveis → API pronta → site).
- Imagens **multi-stage**: uma fase compila (TypeScript / build do Angular), a outra leva só o resultado e as
  dependências de produção.
- A API roda como o usuário **`node`** (não root); o site, numa imagem **nginx sem privilégios** (porta 8080).
- O **nginx** serve os arquivos do Angular (cache longo só para arquivos com hash no nome, fallback para
  `index.html`), **encaminha `/api`** para a API ([0004](0004-prefixo-api-e-mesma-origem.md)) e envia os headers de
  segurança (CSP sem script inline, `X-Frame-Options`, etc.).
- O container da API, ao iniciar, aplica as migrations, cria o usuário de demonstração **só se pedido**
  (`SEED_DEMO_USER=true`) e **sorteia um `JWT_SECRET`** quando nenhum é informado — nada de segredo padrão.
- As portas publicadas ficam em **`127.0.0.1`**: os bancos, com senhas de exemplo, não ficam acessíveis pela rede.

## Consequências

- **+** Um comando para avaliar; a mesma imagem da API roda no Docker, no CI e no Render.
- **+** Imagens menores e sem ferramentas de build; containers sem root.
- **−** Sem `JWT_SECRET` definido, as sessões caem quando o container da API reinicia (aceitável localmente; o deploy
  define o seu).
- **−** O desenvolvimento do dia a dia não usa o Docker para a API e o Angular (recarregamento automático é mais rápido
  fora dele) — são dois caminhos documentados (`docker compose` e `npm start`).

**Alternativas descartadas:** servir o Angular pelo Express (mistura responsabilidades e acopla os deploys);
imagem única para API e site; publicar os bancos em todas as interfaces (foi assim até a auditoria de segurança).

## Onde está

- [`docker-compose.yml`](../../docker-compose.yml) — serviços, ordem de subida e portas em `127.0.0.1`.
- [`backend/Dockerfile`](../../backend/Dockerfile) e [`backend/docker-start.sh`](../../backend/docker-start.sh).
- [`frontend/Dockerfile`](../../frontend/Dockerfile), [`frontend/nginx.conf`](../../frontend/nginx.conf) e
  [`frontend/security-headers.conf`](../../frontend/security-headers.conf).
