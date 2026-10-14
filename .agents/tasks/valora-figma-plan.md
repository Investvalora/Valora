# Plano de Implementação — Valora Novo Fluxo (Figma)

## 1. Estado atual de cada módulo

### Ativos (`/ativos/*`)
- **AtivosPage.tsx** — shell com SubTabBar e Outlet. ✅ Existente.
- **AtivosPosicoes.tsx** — tabela agrupada por classe com KpiBar. ✅ Existente.
  - Gap Figma: mobile precisa de cards colapsáveis por grupo (agora só tabela desktop); o Figma mostra cada grupo (Ações, FIIs, Stocks, ETFs, Cripto) como card expansível com valor total, variação e % da carteira no header, e lista de tickers quando expandido.
- **AtivosComposicao.tsx** — donut + lista de classes. ✅ Existente.
  - Gap Figma: já está bastante alinhado; pequenos ajustes de layout mobile (scroll vertical, percentuais dentro do donut com labels externos nas fatias).
- **AtivosLancamentos.tsx** — gráfico de aportes + tabela de transações. ✅ Existente.
  - Gap Figma: mobile mostra cards de transação (não tabela), cada card com ícone de letra colorida, ticker, badge tipo (FII/Ações/etc.), tipo de ordem (Compra/Venda), quantidade, preço unitário, total, data, fonte, e botões "+ Lançamento" / excluir.

### Ativos › Detalhe do ativo (`/ativo/:ticker`)
- **AtivoDetailPage.tsx** — página legada com seções fixas (preços, fundamentals, dividendos, score, bazin, posição). ✅ Existente, mas design antigo.
  - Gap Figma: o novo design tem 6 sub-tabs (Visão geral, Lançam., Proventos, Rentab., Score, Alertas), hero com avatar colorido + cotação + variação diária, KPIs em grid 2×3, gráfico cotação vs. preço médio (linha dupla), bloco "Resultado da posição" (valor investido, ganho de capital, proventos 12M, rentabilidade total, vs CDI), seções de "Lançamentos do ativo" (preview 3 itens + "Ver todos") e "Proventos do ativo" (preview + "Ver todos"), e bloco "Score e alertas" com barra de progresso Bazin + cards de alertas recentes. Desktop adiciona layout 2-colunas para gráfico + resultado lado a lado, e 3 cards na parte inferior.

### Desempenho (`/desempenho/*`)
- **DesempenhoPage.tsx** — shell com SubTabBar. ✅ Existente.
- **DesempenhoRentabilidade.tsx** — gráfico de linha + tabela mensal + tabela por ativo. ✅ Existente.
  - Gap Figma: mobile tem faixa contextual horizontal (3 KPI pills: "Rentabilidade total", "Últimos 12M", "Lucro total") em vez da barra vertical; tabela mensal mostra Anual e Acumulado por ano em accordion; tabela por ativo lista ticker, % vs CDI lado a lado. Visual alinhado com o existente, mas a faixa de KPIs precisa ser pill-style.
- **DesempenhoProventos.tsx** — gráfico de barras + tabela de proventos recebidos. ✅ Existente.
  - Gap Figma: mobile usa cards de provento (não tabela) com ticker + badge tipo + total em verde + data com / valor/cota / quantidade; rodapé "Mostrando X de Y" com paginação simples. KPI bar mostra Proventos (12M), Média mensal, Maior mês.

### Análise (`/analise/*`)
- **AnalisePage.tsx** — shell com SubTabBar. ✅ Existente.
- **AnaliseScore.tsx** — tabela flat de regras. ✅ Existente, mas design antigo (tabela).
  - Gap Figma: o novo design agrupa as regras por **nome do score** em cards. Cada card tem: nome do score (ex: "Dividendos Premium"), "N regras · M pontos", botão "Usar este score", e linhas de regra com métrica, condição e badge de pontos (+3, +2, etc.) com ações editar/excluir. Completamente diferente da tabela atual.
- **AnaliseAlertas.tsx** — lista de cards de alertas. ✅ Existente.
  - Gap Figma: adiciona toggle de filtro "Todos / Novos / Ignorados" no topo (segmentado pill), e botão de refresh circular.

---

## 2. Detalhes por tela — arquivo destino, componentes, notas de layout

### Tela A — Mobile/Desktop: Ativos › Posições (`AtivosPosicoes.tsx`)

**Arquivo:** `src/modules/ativos/components/AtivosPosicoes.tsx`

**Design Figma (223:1965):**
- Header: "Posições · 28 ativos", botões Filtrar + Exportar CSV
- KPI bar: Patrimônio total | Valor investido | Ganho de capital (3 pills)
- Grupos por classe como **cards expansíveis**: cada card tem header com ícone-letra colorido, nome da classe, valor total, variação %, % da carteira — e ao expandir mostra lista de tickers com valor e variação
- Atualmente no desktop a `AtivosTable` já funciona; a mudança é para mobile

**Componentes a reutilizar:** `KpiBarAtivos`, `PanelCard`, `ResumoCarteiraPopover`, `assetClassColor`

**Componentes novos:**
- `AssetGroupCard` (interno em AtivosPosicoes) — card de grupo colapsável com header expansível

**Notas de responsividade:**
- Desktop (`md:` breakpoint): tabela existente com colunas completas
- Mobile (< md): cards de grupo com accordion; cada ticker linha simples (ticker, valor, variação %)

---

### Tela B — Mobile: Ativos › Composição (`AtivosComposicao.tsx`)

**Arquivo:** `src/modules/ativos/components/AtivosComposicao.tsx`

**Design Figma (221:1809):**
- Já bastante alinhado com o existente
- KPI bar com 3 valores (Patrimônio, Valor investido, Ganho de capital)
- Donut centralizado com percentuais nas fatias (labels externos no SVG)
- Lista de classes abaixo com dot colorido, nome, badge "Internacional", ticker top, valor e %

**Mudanças necessárias:**
- Adicionar percentuais como labels no SVG do donut (texto nas fatias)
- KPI bar mobile: mostrar apenas 3 KPIs (sem "Ativos"), usar scroll horizontal se necessário
- Ajustar proporções para mobile (donut menor, ~180px)

---

### Tela C — Mobile: Ativos › Lançamentos (`AtivosLancamentos.tsx`)

**Arquivo:** `src/modules/ativos/components/AtivosLancamentos.tsx`

**Design Figma (221:2077):**
- KPI bar: Patrimônio | Valor investido | Ganho de capital
- Gráfico de aportes (já existente)
- Seção "Renda variável [28]" com campo busca
- Mobile: **cards** (não tabela) para cada transação — cada card tem:
  - Linha 1: ícone-letra colorido + ticker + badge classe (FII, Ações, etc.) + tipo de ordem (Compra/Venda, colorido verde/rosa) — alinhados horizontalmente
  - Linha 2: Quantidade / Preço unitário / Total — 3 colunas
  - Linha 3: data + "Manual" + botões "+ Lançamento" + lixeira
- Desktop: mantém a tabela atual

**Componentes novos:**
- `TransactionCard` (interno) — card mobile de transação substituindo `TxnRow` em telas pequenas
- `MobileTransactionList` (wrapper) — renderiza `TransactionCard` no mobile, tabela no desktop

**Notas de responsividade:**
- `hidden md:block` na tabela existente; `block md:hidden` nos cards

---

### Tela D — Mobile + Desktop: Ativos › Detalhe do ativo (`AtivoDetailPage.tsx`)

**Arquivo:** `src/modules/assets/components/AtivoDetailPage.tsx` (refatoração completa)

**Design Figma (223:2212 mobile, 219:1774 desktop):**
- Hero novo: avatar quadrado com letra inicial colorida (cor da classe), ticker grande, badge tipo (FII/Ação), nome do ativo, cotação atual + variação diária % (colorida verde/rosa)
- Botões de ação: "+ Lançamento do ativo" | "Criar alerta" — lado a lado
- Sub-tabs com SubTabBar: **Visão geral | Lançam. | Proventos | Rentab. | Score | Alertas**
- Sub-tab Visão geral (tab padrão):
  - Grid de KPIs 2×3: Quantidade, Preço médio, Saldo, % da carteira, Variação, Dividend Yield
  - Seção "Cotação e preço médio" — gráfico de linha dupla (cotação azul + preço médio amarelo tracejado) com legenda
  - Seção "Resultado da posição" — card com linhas: Valor investido, Ganho de capital (+verde), Proventos recebidos (12M, verde), Rentabilidade total (+%), vs CDI (p.p.)
  - Seção "Lançamentos do ativo" — preview 3 itens recentes + link "Ver todos >"
  - Seção "Proventos do ativo" — preview itens recentes + link "Ver todos >"
  - Seção "Score e alertas" — barra de progresso Bazin ("N/4 regras"), cards de alertas recentes (badge Novo/Ignorado)
- Desktop: layout 2 colunas no bloco do gráfico (gráfico à esquerda, Resultado da posição à direita); 3 cards na parte de baixo em grid de 3 colunas

**Componentes novos:**
- `AssetDetailHero` — hero com avatar, ticker, badge, cotação, variação, botões de ação
- `AssetKpiGrid` — grid 2×3 de KPI cards bordados
- `AssetPriceChart` — gráfico de linha dupla (cotação + preço médio) usando `PriceLineChart` existente + linha tracejada de preço médio como dataset adicional
- `AssetPositionResult` — card "Resultado da posição" com linhas
- `AssetTransactionPreview` — preview de 3 lançamentos recentes + link "Ver todos"
- `AssetDividendPreview` — preview de proventos recentes + link "Ver todos"
- `AssetScoreAlerts` — bloco com barra de progresso Bazin + lista de alertas recentes

**Rotas adicionais internas (sub-tabs):**
- As tabs Lançam., Proventos, Rentab., Score e Alertas no Figma são sub-abas dentro da página de detalhe. A implementação usa `useState` para trocar conteúdo (não react-router sub-routes), mantendo `/ativo/:ticker` como rota única.

**Notas de responsividade:**
- Mobile: layout em coluna única, KPIs em grid 2 colunas, gráfico full-width
- Desktop (lg:): gráfico + resultado lado a lado (2 colunas), 3 cards no bottom em grid 3 colunas

---

### Tela E — Mobile: Desempenho › Rentabilidade (`DesempenhoRentabilidade.tsx`)

**Arquivo:** `src/modules/desempenho/components/DesempenhoRentabilidade.tsx`

**Design Figma (221:2404):**
- Faixa contextual: 3 KPI pills horizontais scrolláveis — "Rentabilidade total" (+5,54% verde), "Últimos 12M" (—), "Lucro total" (R$ 1.568,77 verde)
- Gráfico linha já existente
- Tabela mensal: accordion por ano com colunas Anual e Acumulado no header e grid de meses Jan-Dez; células mostram % ou "—"
- Tabela por ativo: ticker com avatar, nome abaixo, % rentabilidade e vs CDI p.p. — sem coluna "Valor atual" no mobile

**Mudanças necessárias:**
- Substituir a KPI bar vertical existente por pills horizontais scrolláveis
- Melhorar `TabelaMensal` para mostrar Anual e Acumulado por ano no header, separando anos como seções
- No mobile, simplificar a tabela por ativo (ocultar "Valor atual" e barra de progresso)

---

### Tela F — Mobile: Desempenho › Proventos (`DesempenhoProventos.tsx`)

**Arquivo:** `src/modules/desempenho/components/DesempenhoProventos.tsx`

**Design Figma (221:2813):**
- KPI bar: Proventos (12M), Média mensal, Maior mês — 3 valores em barra horizontal
- Gráfico de barras já existente
- "Proventos recebidos [48]" com campo de busca + dropdown "Todos os tipos"
- Mobile: **cards** por provento (não tabela) — cada card tem:
  - Linha 1: ticker + badge tipo (DIVIDEND) + total em verde (direita)
  - Linha 2: Data com / Valor/cota / Quantidade — 3 colunas
  - Rodapé "Mostrando X de Y" paginado

**Mudanças necessárias:**
- Mobile: substituir tabela por cards de provento
- Desktop: manter tabela existente
- Adicionar rodapé de paginação ("Mostrando X de Y") com load more ou virtual scroll

---

### Tela G — Mobile: Análise › Score (`AnaliseScore.tsx`)

**Arquivo:** `src/modules/analise/components/AnaliseScore.tsx`

**Design Figma (221:3112):**
- Agrupamento por nome de score em cards (border rounded-[10px])
- Cada card: header com nome, "N regras · M pontos", botão "Usar este score" (azul-roxo borda)
- Linhas de regra: métrica (DY %, P/L, etc.), condição (≥ 7, < 15), badge de pontos (+3, +2, +1 verde) + ícone lápis + ícone lixeira
- Último item sem border-b

**Mudanças necessárias:**
- Agrupar as regras pelo campo `name` (nome do score) em vez de tabela flat
- Criar `ScoreGroupCard` com header expansível (ou fixo) e lista de regras internamente
- Substituir tabela por lista de `ScoreGroupCard`

---

### Tela H — Mobile: Análise › Alertas (`AnaliseAlertas.tsx`)

**Arquivo:** `src/modules/analise/components/AnaliseAlertas.tsx`

**Design Figma (221:3339):**
- Toggle de filtro segmentado: "Todos (9)" | "Novos" | "Ignorados" + botão refresh circular
- Cards de alerta com mesma estrutura atual (ícone, ticker, badge tipo, badge status Novo/Ignorado, título, descrição, data, ações)
- Botão "+ Alerta de preço" no topo (já existe)

**Mudanças necessárias:**
- Adicionar toggle "Todos / Novos / Ignorados" com contagens
- Adicionar botão refresh circular (já existe o generate.mutate, só ícone)
- Mover botão "+ Alerta de preço" para ficar no header

---

## 3. Lista ordenada de implementação (dependências primeiro)

1. **Shared: `AssetGroupCard` pattern** — cria o componente reutilizável de grupo colapsável
2. **AnaliseScore** — refatoração de tabela flat → grupos de score (ScoreGroupCard) ← sem dependências externas
3. **AnaliseAlertas** — adicionar toggle de filtro e botão refresh ← sem dependências externas
4. **DesempenhoProventos** — adicionar cards mobile + paginação ← sem dependências externas
5. **DesempenhoRentabilidade** — pills KPI + melhoria TabelaMensal ← depende do `TabelaMensal.tsx` existente
6. **AtivosComposicao** — labels no donut SVG + mobile polish ← sem dependências externas
7. **AtivosLancamentos** — cards mobile para transações ← sem dependências externas
8. **AtivosPosicoes** — cards de grupo colapsáveis mobile ← usa `AssetGroupCard` do item 1
9. **AtivoDetailPage** — refatoração completa nova ← depende de todos os hooks existentes + novos sub-componentes

---

## 4. Rotas a adicionar/atualizar em `routes.tsx`

Nenhuma rota nova é necessária. Todas as mudanças são visuais dentro das rotas existentes:

- `/ativos/posicoes` — `AtivosPosicoes` (modificado)
- `/ativos/composicao` — `AtivosComposicao` (modificado)
- `/ativos/lancamentos` — `AtivosLancamentos` (modificado)
- `/desempenho/rentabilidade` — `DesempenhoRentabilidade` (modificado)
- `/desempenho/proventos` — `DesempenhoProventos` (modificado)
- `/analise/score` — `AnaliseScore` (modificado)
- `/analise/alertas` — `AnaliseAlertas` (modificado)
- `/ativo/:ticker` — `AtivoDetailPage` (refatorado com sub-tabs internas por useState)

---

## 5. Componentes compartilhados novos (múltiplas telas)

### `KpiPillBar` — `src/shared/components/KpiPillBar.tsx`
Faixa de KPI pills horizontais scrolláveis, usada em DesempenhoRentabilidade e DesempenhoProventos mobile.
```
Props: items: { label: string; value: string; colorClass?: string }[]
```

### `MobileCardList` / pattern de responsividade
Não um componente único, mas o padrão `block md:hidden` / `hidden md:block` adotado em AtivosLancamentos e DesempenhoProventos para cards mobile vs tabela desktop.

### `ScoreGroupCard` — `src/modules/analise/components/ScoreGroupCard.tsx`
Card de grupo de score com header (nome, contagem, botão "Usar este score") e lista de linhas de regra. Usado apenas em AnaliseScore mas isolado para testabilidade.

### `AssetGroupCard` — `src/modules/ativos/components/AssetGroupCard.tsx`
Card de grupo de ativos colapsável com avatar, classe, valor total, variação, % da carteira e lista de tickers. Usado em AtivosPosicoes.

---

> Este plano foi gerado com base nos designs Figma (página "Novo fluxo") e na inspeção do código existente em `src/modules/`. Os arquivos de destino correspondem aos caminhos reais do projeto.
