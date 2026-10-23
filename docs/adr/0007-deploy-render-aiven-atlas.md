# 0007 — Deploy gratuito: Render + Aiven (MySQL) + Atlas (MongoDB)

**Status:** aceita

## Contexto

A demo precisa ficar no ar sem custo, sem cartão de crédito e sem segredos no repositório, usando a mesma imagem
Docker da API e com os dois bancos gerenciados.

## Decisão

- **Render**, plano gratuito, descrito em código num **Blueprint** (`render.yaml`):
  - a **API** como serviço Docker (o mesmo `backend/Dockerfile`), na Virgínia; o Render só manda tráfego para uma
    versão nova quando o `/api/health/ready` responde 200;
  - o **site** como site estático (build do Angular na CDN do Render), reconstruído a cada push, com _rewrite_ de
    `/api/*` para a API ([0004](0004-prefixo-api-e-mesma-origem.md)) e os mesmos headers de segurança do nginx.
- **MySQL no Aiven** (plano gratuito permanente). O Aiven só aceita conexão criptografada: a API recebe o certificado
  da autoridade do Aiven (`DB_SSL_CA`) e confere o servidor contra ele.
- **MongoDB no Atlas** (cluster gratuito M0, AWS us-east-1) com um usuário só com `readWrite` no banco `todo`.
- **Segredos só nos painéis**: o `JWT_SECRET` é gerado pelo próprio Render e mantido entre deploys; os dados dos bancos
  são campos `sync: false` do Blueprint.

## Consequências

- **+** Custo zero; infraestrutura versionada; deploy automático a cada push.
- **−** O plano gratuito "dorme" após 15 minutos sem uso: a primeira requisição depois disso leva até cerca de um
  minuto.
- **−** O MySQL gratuito do Aiven ficou em San Francisco e a API na Virgínia: listar as tarefas leva ~0,4–0,65 s
  medido do Brasil. Mover a API para Oregon ganharia ~0,05 s e exigiria recriar o serviço — não compensou.
- **−** Atrás do _rewrite_ do site e do balanceador do Render, o IP do visitante depende de `TRUST_PROXY` estar certo
  para o limite de tentativas continuar por pessoa. Medido em produção: com `TRUST_PROXY=1`, a API registrava
  `10.29.166.92` (o salto interno do _rewrite_) em vez do IP de quem entrou — todos dividiam um limite. `2` acertaria
  pelo site, mas deixaria quem chama a API direto (um salto só) escolher o próprio IP forjando `X-Forwarded-For`. A
  decisão foi confiar **na rede privada** (`uniquelocal`), não numa contagem. O log seguinte mostrou `::1`: há também
  um proxy no próprio contêiner do serviço, que conecta por `localhost` — por isso o valor final é
  `loopback, uniquelocal`.
- **−** No CI, o MongoDB 8.x não inicia nos kernels Linux 6.19–7.0.13 dos runners do GitHub (SERVER-125742): o CI usa
  MongoDB 7.0 até o GitHub atualizar o kernel (o Atlas segue em 8.0).

**Alternativas descartadas:** Railway (só crédito de teste); Fly.io (exige cartão); TiDB Serverless (compatível com
MySQL, mas não é MySQL); Vercel/Netlify para o site (mais um provedor, sem ganho sobre o site estático do Render).

## Onde está

- [`render.yaml`](../../render.yaml) — os dois serviços, variáveis e regras.
- [`backend/src/config.ts`](../../backend/src/config.ts) — `DB_SSL_CA`, `TRUST_PROXY`, `COOKIE_SECURE` e a recusa de
  segredos de exemplo em produção.
- [`backend/docker-start.sh`](../../backend/docker-start.sh) — migrations e usuário demo a cada deploy.
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — MongoDB 7.0 no CI e o motivo.
