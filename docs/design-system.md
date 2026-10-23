# Design system — TechX Tasks

A direção visual da aplicação: o que cada cor, tamanho e espaço faz, e por quê. É a referência para os tokens CSS
(`frontend/src/styles.scss`) e para as telas redesenhadas. Quando um valor daqui e um valor do código discordarem, um
dos dois está errado — corrija o que estiver em desacordo com a decisão escrita aqui, ou mude a decisão aqui primeiro.

## 1. A ideia

TechX Tasks é uma **ferramenta de trabalho**, aberta várias vezes por dia para responder uma pergunta:

> **O que eu preciso fazer agora?**

Tudo na tela serve a essa pergunta. Daí vem a regra que organiza o resto do documento:

> **A cor é um sinal, não uma decoração.** A interface é em tinta (preto, cinzas, branco). Só duas coisas recebem
> cor: o que **vence hoje** (azul) e o que **está atrasado** (vermelho). Se a tela inteira estiver em cinza, nada
> precisa de atenção — e isso também é uma resposta.

Uma pessoa que abre a lista deve encontrar, em dois segundos, o que está atrasado e o que vence hoje, e ter o campo
"Nova tarefa" a um clique. O resto (filtros, notas, histórico) fica disponível sem disputar atenção.

### Referências

Três produtos de trabalho com sistemas visuais documentados serviram de comparação. De cada um veio uma decisão, e
também o que **não** foi copiado:

| Referência | O que veio dela                                                                      | O que ficou de fora                                     |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Vercel     | Ação principal em tinta quase preta; uma família geométrica (Geist); base de 4 px    | O gradiente colorido de marca; rótulos em monoespaçada  |
| Linear     | Hierarquia por degraus de superfície em vez de sombras; um único acento, usado pouco | O tema escuro como padrão; o lilás da marca             |
| Notion     | Botões com cantos de 8 px, não pílulas; entrelinha generosa no texto corrido         | Ilustrações e cartões em tons pastel (são de marketing) |

A comparação também confirmou o que telas de trabalho bem resolvidas têm em comum: pouca cor (a maior parte abaixo de
5% dos pixels), cartões sem sombra, títulos de 24 px em vez de cabeçalhos grandes, números alinhados em colunas.

## 2. Cor

### 2.1 Tema claro (o padrão)

| Papel              | Token              | Valor     | Uso                                                                         |
| ------------------ | ------------------ | --------- | --------------------------------------------------------------------------- |
| Fundo da página    | `--color-ground`   | `#f2f4f7` | Atrás de tudo. Um cinza-azulado de papel de agenda, um passo fora do branco |
| Superfície         | `--color-surface`  | `#ffffff` | Cartões de tarefa, formulário, painel de detalhes, calendário               |
| Superfície elevada | `--color-raised`   | `#eeeeee` | Item ativo, botão secundário, pílulas neutras                               |
| Borda de cartão    | `--color-border`   | `#e6e6e6` | Contorno de cartões e painéis (não é controle)                              |
| Divisória          | `--color-rule`     | `#f0f0f0` | Separação entre linhas dentro de um cartão                                  |
| Borda de controle  | `--color-control`  | `#80868f` | Campos, selects, caixas de seleção — precisa ser encontrável                |
| Texto              | `--color-text`     | `#0a0a0a` | Títulos, conteúdo, números                                                  |
| Texto secundário   | `--color-muted`    | `#5f6368` | Descrições, rótulos, datas, ajudas, placeholders                            |
| Ação principal     | `--color-primary`  | `#141414` | O botão "Adicionar tarefa" (um por tela), com texto branco                  |
| **Hoje**           | `--color-today`    | `#1d5fbf` | "Vence hoje", o dia de hoje no calendário, foco do teclado, a marca         |
| **Atrasada**       | `--color-overdue`  | `#c4242a` | A barra e o selo "Atrasada"; texto de erro                                  |
| Positivo           | `--color-positive` | `#2e7d32` | "Concluída" como texto, confirmações ("Notas e tags salvas.")               |

Pares para selos (fundo claro + texto escuro do mesmo tom, nunca texto branco em cor saturada):

| Selo       | Fundo                            | Texto                           |
| ---------- | -------------------------------- | ------------------------------- |
| Atrasada   | `--color-overdue-soft` `#ffedea` | `--color-overdue-ink` `#831c1e` |
| Vence hoje | `--color-today-soft` `#e8f0fc`   | `--color-today` `#1d5fbf`       |
| Neutro     | `--color-raised` `#eeeeee`       | `--color-chip-ink` `#3d3d3d`    |
| Aviso      | `--color-notice-soft` `#fffbeb`  | `--color-notice-ink` `#92400e`  |

Os mesmos pares servem para as caixas de mensagem: erro de uma ação (atrasada), aviso de sessão expirada (aviso).

**Estados de interação.** O hover escurece um degrau; nunca muda de cor.

| Token                   | Valor     | Onde                                             |
| ----------------------- | --------- | ------------------------------------------------ |
| `--color-primary-hover` | `#2e2e2e` | Botão principal com o cursor em cima             |
| `--color-raised-hover`  | `#e4e4e4` | Botão secundário com o cursor em cima            |
| `--color-today-hover`   | `#174ea0` | Dia escolhido no calendário com o cursor em cima |

O cinza do hover secundário foi escolhido pelo pior caso: o "Excluir" em vermelho continua acima de 4,5:1 sobre ele
(`#e2e2e2`, um tom mais escuro, já reprovaria).

**Por que o azul é o "hoje".** Azul é a cor que a maioria das agendas e calendários usa para marcar o dia atual; quem
abre a lista reconhece sem legenda. O vermelho fica reservado para o que já passou do prazo. São as **duas únicas
cores** da interface: com isso, o primeiro olhar vai direto para o que importa.

**Por que a ação principal é preta, e não azul.** Se o botão fosse azul, o azul deixaria de significar "hoje". Um
único botão preto por tela já é a coisa mais forte da interface; não precisa de cor.

**Por que o fundo é cinza-azulado.** Um fundo `#f8f8f8` genérico faz a tela parecer um kit qualquer. O cinza-azulado
(`#f2f4f7`, saturação baixa) lembra papel de agenda e conversa com o azul do "hoje" sem competir com ele. Os cartões
continuam brancos e se destacam do fundo por esse degrau de tom, sem sombra.

### 2.2 Contraste (WCAG 2.2, nível AA)

Medido para cada par que carrega informação. Texto precisa de **4,5:1**; bordas de controle e indicadores de foco,
**3:1**.

| Par                                              | Contraste   |
| ------------------------------------------------ | ----------- |
| Texto `#0a0a0a` no branco / no fundo             | 19,8 / 18,0 |
| Secundário `#5f6368` no branco / no fundo        | 6,05 / 5,49 |
| Hoje `#1d5fbf` no branco / no fundo              | 6,10 / 5,54 |
| Atrasada `#c4242a` no branco                     | 5,78        |
| Positivo `#2e7d32` no branco                     | 5,13        |
| Selo atrasada `#831c1e` em `#ffedea`             | 8,63        |
| Selo neutro `#3d3d3d` em `#eeeeee`               | 9,36        |
| Texto branco no botão principal `#141414`        | 18,4        |
| Texto branco no dia escolhido `#1d5fbf`          | 6,10        |
| Texto no botão secundário `#eeeeee`              | 17,1        |
| "Excluir" `#c4242a` no botão secundário          | 4,98        |
| "Excluir" no hover do secundário `#e4e4e4`       | 4,55        |
| Secundário `#5f6368` no hover `#e4e4e4`          | 4,76        |
| Texto branco no hover do principal `#2e2e2e`     | 13,6        |
| Selo hoje `#1d5fbf` em `#e8f0fc`                 | 5,32        |
| Texto branco no hover do dia `#174ea0`           | 7,97        |
| Aviso `#92400e` em `#fffbeb`                     | 6,84        |
| Texto branco no botão destrutivo `#c4242a`       | 5,78        |
| Texto branco no hover do destrutivo `#831c1e`    | 9,77        |
| Borda de controle `#80868f` no branco / no fundo | 3,67 / 3,33 |

**Uma decisão contra o costume.** Muitas telas usam bordas de campo bem claras (`#d4d4d4`, cerca de 1,5:1). Elas
somem para quem enxerga pouco, e a WCAG pede 3:1 para o contorno de um controle. Aqui os campos têm borda
`#80868f`; os **cartões**, que não são controles, mantêm a borda clara.

**O placeholder também conta.** O texto `__/__/____` do campo de data e "Título ou descrição…" na busca usam o
secundário (`#5f6368`, 6,05:1), nunca um cinza mais claro.

### 2.3 Tema escuro (planejado)

O modo escuro vem numa etapa posterior; os papéis são os mesmos e só os valores mudam. Fundo **neutro**, sem azul-marinho
nem ardósia, e hierarquia por degraus de claridade.

| Token             | Claro     | Escuro    | Contraste no escuro                  |
| ----------------- | --------- | --------- | ------------------------------------ |
| `--color-ground`  | `#f2f4f7` | `#0a0a0a` | —                                    |
| `--color-surface` | `#ffffff` | `#111111` | —                                    |
| `--color-raised`  | `#eeeeee` | `#1f1f1f` | —                                    |
| `--color-border`  | `#e6e6e6` | `#262626` | —                                    |
| `--color-rule`    | `#f0f0f0` | `#1a1a1a` | —                                    |
| `--color-control` | `#80868f` | `#707070` | 3,81 na superfície                   |
| `--color-text`    | `#0a0a0a` | `#f5f5f5` | 17,3                                 |
| `--color-muted`   | `#5f6368` | `#b4b4b4` | 9,11                                 |
| `--color-primary` | `#141414` | `#f5f5f5` | invertido: fundo claro, texto escuro |
| `--color-today`   | `#1d5fbf` | `#6ea8ff` | 7,83 (o azul do claro daria só 3,09) |
| `--color-overdue` | `#c4242a` | `#f07178` | 6,60                                 |

O azul e o vermelho do tema claro **não servem** no escuro: ficam abaixo de 4,5:1 sobre `#111111`. Por isso cada um
tem a sua versão mais clara.

## 3. Tipografia

**Uma família: Geist** (licença SIL OFL), em 400, 500 e 600. Geométrica sem ser fria, com algarismos tabulares e
todos os acentos do português (ã, õ, ç, é, ê). **Geist Mono** existe na mesma família, mas não é usada: a interface
não tem códigos nem IDs para mostrar.

A fonte é **servida pelo próprio site**, não por um serviço externo: a política de segurança (CSP) só permite fontes
do próprio domínio (`font-src 'self'`), e assim nenhuma requisição revela a outro serviço quem abriu a página.

| Papel            | Token            | Tamanho / entrelinha | Peso | Onde                                     |
| ---------------- | ---------------- | -------------------- | ---- | ---------------------------------------- |
| Título da tela   | `--font-title`   | 24 / 32 px           | 600  | "Tarefas", "Entrar", "Criar conta"       |
| Título de seção  | `--font-section` | 18 / 26 px           | 600  | "Nova tarefa", "Histórico"               |
| Título da tarefa | `--font-item`    | 16 / 24 px           | 500  | O título em cada cartão                  |
| Corpo            | `--font-body`    | 15 / 22 px           | 400  | Descrição, campos, botões, mensagens     |
| Pequeno          | `--font-small`   | 13 / 18 px           | 400  | Prazo, situação, rótulos de ajuda, selos |
| Número do resumo | `--font-figure`  | 24 / 28 px           | 500  | As contagens no topo da lista            |

- **Cinco tamanhos**, nenhum maior que 24 px. Isto é uma ferramenta, não uma página de apresentação: título grande
  demais faz a tela parecer propaganda.
- **Corpo em 15 px**, um pouco acima do comum em telas de trabalho (14 px): textos em português são cerca de 20 a 30%
  mais longos que em inglês, e a descrição de uma tarefa é lida, não só escaneada.
- **Peso 600 é o teto.** Sem 700/800: a hierarquia vem do tamanho e da cor (tinta contra secundário), não do negrito.
- **Algarismos tabulares** (`font-variant-numeric: tabular-nums`) em todo número que se alinha ou muda: contagens,
  datas, o calendário.
- **Sem caixa alta** em rótulos e botões ("Adicionar tarefa", não "ADICIONAR TAREFA"); espaçamento entre letras
  normal, e levemente negativo só no título (`-0.01em`).
- Linhas de texto corrido com no máximo ~70 caracteres; a descrição de uma tarefa quebra linha, nunca é cortada.

## 4. Espaço

**Base de 4 px.** Todo espaçamento é múltiplo de 4, e a escala tem poucos degraus para que as distâncias se repitam:

| Token         | Valor | Uso típico                                                |
| ------------- | ----- | --------------------------------------------------------- |
| `--space-0-5` | 2 px  | Ajuste fino: altura interna de selos, grade do calendário |
| `--space-1`   | 4 px  | Entre um ícone e o texto ao lado; dentro de selos         |
| `--space-2`   | 8 px  | Entre botões de uma fileira; entre rótulo e campo         |
| `--space-3`   | 12 px | **A distância entre cartões** (vertical e horizontal)     |
| `--space-4`   | 16 px | Entre campos de um formulário; margem da tela no celular  |
| `--space-5`   | 20 px | Recuo interno dos cartões                                 |
| `--space-6`   | 24 px | Margem da tela no desktop; entre título e conteúdo        |
| `--space-8`   | 32 px | Entre seções ("Nova tarefa" → "Tarefas")                  |
| `--space-12`  | 48 px | Do topo da tela ao título, no desktop                     |

**Uma distância entre cartões só** (12 px), na vertical e na horizontal. Distâncias misturadas (12 aqui, 16 ali) são o
que faz uma tela parecer remendada.

### Densidade

A lista é **esparsa**: uma pessoa tem poucas dezenas de tarefas, e cada uma é lida.

| Token              | Valor  | O que é                                                                                                 |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------- |
| `--size-control`   | 40 px  | Altura de campos e botões (o padrão de telas de trabalho é 32–36; 40 dá alvo maior e cabe o calendário) |
| `--size-touch`     | 44 px  | Altura mínima de qualquer alvo no celular                                                               |
| `--size-content`   | 760 px | Largura máxima da coluna de conteúdo no desktop                                                         |
| `--size-form`      | 416 px | Largura do cartão de login e cadastro (um formulário curto não estica)                                  |
| `--size-popover`   | 288 px | Largura do calendário (sete colunas de dias com alvo de ~40 px)                                         |
| `--size-field-min` | 160 px | Largura mínima de um campo lado a lado (prazo e prioridade, filtros); abaixo disso, empilham            |
| `--size-icon`      | 16 px  | Ícones de interface                                                                                     |
| `--size-checkbox`  | 18 px  | Caixa de concluir tarefa                                                                                |

**Por que uma coluna de 760 px**, e não a tela inteira. A lista tem uma coluna de informação (título, descrição,
prazo); esticada a 1300 px, o título fica de um lado e o prazo a 1000 px dele. Numa coluna de 760 px tudo se lê numa
linha de olhar, como numa agenda.

## 5. Formas

### Raio

| Token              | Valor | Onde                                                          |
| ------------------ | ----- | ------------------------------------------------------------- |
| `--radius-card`    | 8 px  | Cartões de tarefa, formulário, painel de detalhes, calendário |
| `--radius-control` | 6 px  | Campos, botões, selects, dias do calendário                   |
| `--radius-chip`    | 4 px  | Selos ("Atrasada", "Prioridade alta")                         |

Cantos **firmes** (4–8 px), não arredondados demais: o arredondado de 12–16 px é o padrão de qualquer kit e combina
com aplicativos de consumo; uma ferramenta de trabalho pede cantos mais retos. Os raios **descem** por nível (cartão
8 → controle 6 → selo 4), para que um elemento dentro do outro acompanhe a curva.

### Bordas e elevação

- Superfícies se separam por **um degrau de tom** (cartão branco sobre fundo cinza-azulado) **e** uma borda de 1 px
  `--color-border`. **Nada em repouso tem sombra.**
- **Sombra só no que flutua sobre o conteúdo**: o calendário aberto, menus, diálogos.

| Token            | Valor                                                             | Onde                        |
| ---------------- | ----------------------------------------------------------------- | --------------------------- |
| `--shadow-float` | `0 8px 24px rgb(16 24 40 / 0.12), 0 2px 6px rgb(16 24 40 / 0.06)` | Calendário, menus, diálogos |
| `--color-scrim`  | `rgb(16 24 40 / 0.4)`                                             | Atrás de um diálogo modal   |

Duas sombras pequenas sobrepostas imitam a luz natural melhor que uma sombra grande e borrada. O véu atrás de um
diálogo usa o mesmo tom da sombra: a página continua visível, mas claramente posta de lado.

### Foco do teclado

`--focus-ring`: contorno de **2 px** em `--color-today`, afastado 2 px do elemento, só para quem navega pelo teclado
(`:focus-visible`). Contraste de 6,10:1 sobre o branco. O foco nunca é removido sem substituto.

## 6. Componentes

- **Botões.** Um botão **principal** por tela (preto, texto branco: "Adicionar tarefa", "Entrar"). Os outros são
  **secundários** (fundo `--color-raised`, sem borda: "Editar", "Detalhes", "Cancelar") ou **de texto** (só a
  palavra, para ações discretas). "Excluir" é secundário com o texto em `--color-overdue`. Todos com 40 px de altura e
  cantos de 6 px; nunca pílulas, nunca gradiente.
- **Diálogo de confirmação.** Só para o que não se desfaz (excluir uma tarefa). Cartão branco sobre o véu
  `--color-scrim`, com `--shadow-float`; título em pergunta ("Excluir a tarefa?"), uma frase com o nome do item e o
  que se perde junto, e dois botões à direita: "Cancelar" (secundário, **com o foco ao abrir**, para que um Enter
  apressado não apague nada) e a ação nomeada ("Excluir tarefa"), o **único botão vermelho cheio** do produto
  (`--color-overdue`, texto branco; hover `--color-overdue-ink`). Esc fecha sem fazer nada. É o `<dialog>` nativo do
  navegador: o foco fica preso dentro dele e volta ao botão que o abriu.
- **Campos.** Rótulo **acima** do campo, sempre visível; o placeholder nunca substitui o rótulo. Erro numa linha de
  texto abaixo do campo, em `--color-overdue`, e a borda do campo na mesma cor.
- **Prioridade.** Não usa cor: "Alta" é um selo neutro com texto em tinta e peso 500; "Média" e "Baixa", selos
  neutros em `--color-muted`. Três cores de prioridade somadas a "hoje" e "atrasada" fariam cinco cores numa lista — e
  a cor deixaria de dizer qualquer coisa.
- **Prazo.** Texto pequeno em `--color-muted` ("Prazo: 25/10/2026"). Se vence hoje: o selo "Vence hoje" e a data em
  `--color-today`. Se atrasou: a barra lateral de 4 px e o selo "Atrasada" em `--color-overdue`. Uma tarefa concluída
  nunca mostra atraso.
- **Concluída.** Título riscado em `--color-muted`; o resto do cartão fica legível.
- **Ícones.** Contorno de 1,5 px, 16 px, em `--color-muted` — só onde ajudam (o calendário no campo de data). Nunca
  dentro de um quadrado ou círculo colorido.

### O elemento próprio do produto: a faixa do dia

No topo da lista, no lugar do resumo genérico "Total · Pendentes · Concluídas", uma **faixa do dia** que responde à
pergunta da tela em números:

> **Atrasadas 2 · Hoje 1 · Próximos 7 dias 3 · Sem prazo 4**

- Cada número é também um **filtro**: um clique mostra só aquelas tarefas.
- "Atrasadas" usa `--color-overdue` **só quando é maior que zero**; "Hoje", `--color-today` só quando é maior que
  zero; os demais ficam em tinta. **Zero é zero**, escrito, em cinza.
- É a primeira coisa lida na tela e a única parte em que os números ganham tamanho (24 px).

## 7. Movimento

O movimento aqui é **resposta**, não espetáculo: confirma que algo aconteceu e mostra de onde veio.

| Token             | Valor                            | Uso                                                              |
| ----------------- | -------------------------------- | ---------------------------------------------------------------- |
| `--duration-fast` | 120 ms                           | Pressionar um botão, hover, foco                                 |
| `--duration-base` | 200 ms                           | Abrir o calendário, o painel de detalhes, entrar uma tarefa nova |
| `--ease-out`      | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Tudo que aparece (rápido no começo, assenta suave)               |

- Só **opacidade e posição** (`transform`): nada de animar largura, altura ou cor de fundo da página.
- **Nenhuma entrada animada** ao abrir a tela: a lista aparece pronta. Anima-se o que muda por ação da pessoa (uma
  tarefa nova entrando, uma tarefa concluída, um painel abrindo).
- Com `prefers-reduced-motion: reduce`, os deslocamentos somem e ficam só as mudanças de opacidade, instantâneas.

## 8. O que não fazer

Cada item abaixo é um padrão comum em interfaces genéricas que esta não usa:

- Gradientes (em fundos, botões ou textos), brilhos, vidro fosco, desfoque de fundo.
- Sombra em cartões parados; cartões com cantos de 16 px e sombra grande.
- Mais de duas cores de significado na tela; uma cor por prioridade ou por categoria.
- Botões coloridos espalhados; mais de um botão principal por tela.
- Rótulos em CAIXA ALTA espaçada; texto em monoespaçada fora de código.
- Ícones dentro de círculos coloridos; emoji em títulos, rótulos ou estados vazios.
- Lilás, violeta ou índigo; bege com terracota.
- Cinza claro demais para texto ou para borda de campo (abaixo de 4,5:1 e 3:1).
- Saudação no lugar do título ("Olá, Ana!"): o título é o nome da tela.

## 9. Estados

- **Vazio:** a moldura e o título ficam; uma frase diz o que fazer ("Nenhuma tarefa cadastrada. Use o formulário acima
  para criar a primeira."). Sem ilustração.
- **Carregando:** o texto "Carregando tarefas…" no lugar da lista; a tela não pula quando os dados chegam.
- **Erro:** dentro do bloco que falhou, numa frase que diz o que falhou e o que fazer, com "Tentar novamente".
  Vermelho só no ícone ou na borda, não num banner. Quando a lista não carrega, a lista anterior sai da tela: ela
  pareceria a resposta aos filtros novos. A frase fala de conexão, nunca de "API" ou "servidor fora do ar" — quem usa
  não precisa saber como o app é feito.
- **Desabilitado:** continua legível e diz por quê; nunca só esmaecido a 30%.
