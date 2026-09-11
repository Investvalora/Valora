---
title: 'Story 3.3 — Tela Proventos: Timeline Mensal e Tabela por Ativo'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'fca5dfe172535e472f0b7d05d0e1c1fb7751eb4b'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** A rota `/proventos` exibe apenas um placeholder. Usuários com posições e dados em `dividends` (seed da Story 3.1) não conseguem visualizar quanto a carteira gerou de renda por proventos, nem quando e por qual ativo.

**Approach:** Criar o módulo `dividends` com service, hook e página que agregam `dividends` filtrados pelas posições do usuário, renderizando um gráfico de barras mensal e uma tabela filtravél/ordenável na rota existente.

## Boundaries & Constraints

**Always:** A fonte de dados é a tabela `dividends` do banco, filtrada pelos tickers das posições do usuário (`positions`). O valor total recebido por ocorrência é `value_per_share × quantity` da posição do usuário no ticker. Períodos disponíveis: 6M, 1A e Tudo. Proventos futuros (`ex_date > hoje`) não são exibidos. Registros com `value_per_share = 0` são excluídos. O `PeriodSelector` de `src/modules/wealth/components/PeriodSelector.tsx` é reutilizado com um subconjunto de períodos (`6M`, `1A`, `Tudo`); não duplicar o componente. A exportação CSV segue exatamente o mesmo padrão de `positionsCsv.ts` (separador `;`, BOM UTF-8, mesma função `escapeCsvField`, `downloadCsv` via `Blob` + `URL.createObjectURL`). O gráfico deve ser lazy-loaded via `React.lazy`.

**Ask First:** Usar `transactions` (tipo `dividend|jcp`) em vez de ou em conjunto com a tabela `dividends`; incluir proventos futuros; exibir proventos de tickers sem posição ativa.

**Never:** Criar nova tabela ou migration; expor service_role no frontend; interpolar ou inventar valores ausentes; duplicar constantes de tipo de ativo ou lógica de exportação CSV já existente.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento | Tratamento de Erro |
|---------|---------------|----------------------|--------------------|
| Usuário sem posições | `positions` vazia | Mensagem "Nenhuma posição cadastrada" no lugar do gráfico e da tabela | — |
| Posições sem dividendos no período | posições existem, `dividends` sem dados no período | Gráfico com barras zeradas; tabela vazia com mensagem "Nenhum provento no período" | — |
| Período com dados | `dividends` com registros válidos para os tickers da carteira | Gráfico de barras por mês; tabela com linhas; soma do período em destaque | — |
| Filtro por ticker | usuário digita ou seleciona ticker | Tabela exibe apenas linhas do ticker; soma do período recalculada | — |
| Filtro por tipo | usuário seleciona tipo (`dividend`, `jcp`, etc.) | Tabela filtra pelo tipo; soma do período recalculada | — |
| Ordenação | usuário clica no cabeçalho da coluna | Tabela reordena; padrão é `ex_date` decrescente | — |
| Exportar CSV | tabela com dados filtrados | Arquivo `proventos.csv` com as linhas visíveis (máx. 500) | Botão desabilitado quando não há dados |
| Erro no fetch | Supabase retorna erro | Mensagem de erro inline com botão de retry; gráfico não renderiza | Retry via `refetch()` |

</frozen-after-approval>

## Code Map

- `src/routes.tsx:19` -- `ProventosPage` é placeholder inline -- substituir por import real do módulo dividends
- `src/modules/wealth/components/PeriodSelector.tsx` -- exporta `PeriodSelector`; aceita `WealthPeriod`; reutilizar — o componente já aceita qualquer subconjunto de períodos passado pelo pai
- `src/modules/wealth/types.ts` -- `WealthPeriod` union type — reutilizar para os períodos 6M/1A/Tudo (todos são valores válidos da union existente)
- `src/modules/portfolio/services/positionService.ts` -- `positionService.listPositions(userId)` retorna `PositionWithAsset[]` — reutilizar para obter os tickers da carteira
- `src/modules/portfolio/hooks/usePositions.ts` -- padrão de hook com `queryKey` exportada — seguir o mesmo padrão no hook de dividends
- `src/modules/portfolio/export/positionsCsv.ts` -- `escapeCsvField`, `downloadPositionsCsv`, padrão BOM + `;` + `Blob` — seguir exatamente o mesmo padrão na exportação de proventos
- `src/shared/services/supabaseClient.ts` -- importar `supabase` client
- `src/shared/utils/isoDate.ts` -- `shiftIsoDate(days)`, `toIsoDate(date)` -- calcular datas de início de período
- `src/modules/auth/hooks/useAuth.ts` -- `useAuth()` retorna `{ user, loading }` — padrão de obtenção do userId
- `src/modules/dividends/types.ts` -- **criar**: `DividendRow { ticker, type, ex_date, payment_date, value_per_share, quantity, total_value }`, `DividendPeriod` (`'6M' | '1A' | 'Tudo'`), `MonthlyBar { month: string; total: number }`
- `src/modules/dividends/services/dividendService.ts` -- **criar**: `dividendService.listDividendsByTickers(tickers, since)` — busca `dividends` pelo campo `ticker IN (tickers)` e `ex_date >= since` e `ex_date <= today` e `value_per_share > 0`; retorna `DividendRaw[]`
- `src/modules/dividends/hooks/useDividends.ts` -- **criar**: `dividendsQueryKey(userId, period, tickers)`, `useDividends(period)`: chama `positionService.listPositions` para obter tickers, depois `dividendService.listDividendsByTickers`; deriva `DividendRow[]` adicionando `quantity` e `total_value` (client-side); `staleTime` 5 minutos
- `src/modules/dividends/utils/dividendCalculations.ts` -- **criar**: funções puras `buildMonthlyBars(rows)` e `filterAndSort(rows, filter, sort)` extraídas para testabilidade
- `src/modules/dividends/components/DividendsBarChart.tsx` -- **criar**: `React.lazy`; Recharts `ResponsiveContainer > BarChart`; tooltip com valor BRL; `isAnimationActive={false}`
- `src/modules/dividends/components/DividendsTable.tsx` -- **criar**: tabela ordenável (ex_date desc padrão) e filtrável por ticker e tipo; exibe ticker, tipo, data COM, data de pagamento, valor por cota, quantidade, valor total; cabeçalhos clicáveis; linha de total ao fim
- `src/modules/dividends/components/ProventosPage.tsx` -- **criar**: orquestra `useDividends`, `useState` para período/filtros/sort, `useMemo` para `buildMonthlyBars` e `filterAndSort`; botão exportar CSV; estados loading/erro/vazio
- `src/modules/dividends/export/dividendsCsv.ts` -- **criar**: `serializeDividendsCsv(rows)` e `downloadDividendsCsv(rows)` seguindo exatamente o padrão de `positionsCsv.ts`

## Tasks & Acceptance

**Execução:**
- [x] `src/modules/dividends/types.ts` -- definir `DividendPeriod`, `DividendRaw`, `DividendRow`, `MonthlyBar`, `DividendSortColumn`, `DividendSort` -- estabelecer contrato de tipos do módulo
- [x] `src/modules/dividends/services/dividendService.ts` -- implementar `dividendService.listDividendsByTickers(tickers, since)`: query em `dividends` filtrando `ticker IN`, `ex_date BETWEEN since AND hoje`, `value_per_share > 0`; limite de 500 registros (NFR-5) -- encapsular acesso ao Supabase
- [x] `src/modules/dividends/utils/dividendCalculations.ts` -- implementar `buildMonthlyBars(rows)` (agrupa por mês `YYYY-MM`, soma `total_value`) e `filterAndSort(rows, tickerFilter, typeFilter, sort)` -- funções puras testáveis
- [x] `src/modules/dividends/hooks/useDividends.ts` -- implementar `dividendsQueryKey(userId, period, tickers)` e `useDividends(period)`: obtém posições via `positionService.listPositions`, depois chama `dividendService`, deriva `DividendRow[]` com `quantity` e `total_value` em `useMemo`; `staleTime` 5 minutos -- núcleo de dados da tela
- [x] `src/modules/dividends/components/DividendsBarChart.tsx` -- `React.lazy` + `Suspense`; `ResponsiveContainer > BarChart`; tooltip com valor BRL formatado com `Intl.NumberFormat`; `isAnimationActive={false}` -- gráfico de barras mensal
- [x] `src/modules/dividends/components/DividendsTable.tsx` -- tabela ordenável e filtrável; inputs de filtro por ticker (text) e tipo (select); cabeçalhos das colunas `ex_date`, `total_value` e `ticker` clicáveis para ordenação; linha de total em destaque no rodapé; acessível (cabeçalhos `<th scope="col">`, `aria-sort`) -- tabela de proventos por ativo
- [x] `src/modules/dividends/export/dividendsCsv.ts` -- `serializeDividendsCsv` e `downloadDividendsCsv` seguindo o padrão de `positionsCsv.ts` (BOM, `;`, `escapeCsvField`, `Blob`) -- exportação CSV de proventos
- [x] `src/modules/dividends/components/ProventosPage.tsx` -- orquestra hook, seletor de período (6M/1A/Tudo), gráfico de barras lazy-loaded, tabela, total do período em destaque, botão "Exportar CSV"; estados: loading (texto), erro (inline com retry), vazio por ausência de posições vs ausência de dividendos -- página completa
- [x] `src/modules/dividends/utils/dividendCalculations.test.ts` -- cobrir os cenários da I/O matrix: sem posições, sem dividendos, filtros, ordenação, agrupamento mensal, proventos futuros excluídos -- provar as funções puras
- [x] `src/routes.tsx` -- substituir placeholder `ProventosPage` inline por `import { ProventosPage } from './modules/dividends/components/ProventosPage'` -- conectar rota existente à implementação real

**Critérios de Aceite:**
- Given usuário com posições e registros em `dividends` para esses tickers, when acessa `/proventos`, then gráfico de barras exibe o total de proventos agrupado por mês (`value_per_share × quantity` somados) para o período selecionado (padrão 6M).
- Given registros com `ex_date > hoje`, when a tela carrega, then esses registros não aparecem no gráfico nem na tabela.
- Given registros com `value_per_share = 0`, when a tela carrega, then esses registros são excluídos da visualização.
- Given o usuário aplica filtro por ticker ou tipo, when filtra, then a tabela atualiza sem recarregar a página e a soma do período é recalculada com base nas linhas visíveis.
- Given cabeçalho clicável da tabela, when clicado, then a tabela reordena; clique duplo alterna a direção; padrão é `ex_date` decrescente.
- Given tabela com dados, when usuário clica "Exportar CSV", then arquivo `proventos.csv` é baixado com as linhas filtradas (máx. 500), separador `;` e BOM UTF-8.
- Given usuário sem posições, when acessa a tela, then mensagem clara é exibida no lugar do gráfico e da tabela.
- Given até 500 registros, when a tela carrega, then o tempo de resposta é ≤2s (NFR-5).
- Given o gráfico, when renderiza, then usa `React.lazy` (lazy-loaded).

## Design Notes

**Cálculo de `total_value` (client-side):**
```
// Para cada linha de dividends retornada pelo service:
// 1. Encontrar a posição do usuário para aquele ticker
// 2. total_value = value_per_share × position.quantity
// Nota: quantity é a quantidade ATUAL da posição (não histórica).
// Isso é consistente com a abordagem do épico de usar a posição vigente.
```

**Subconjunto de períodos do `PeriodSelector`:**
O componente atual itera sobre um array `PERIODS` fixo internamente. Para usar apenas `6M`/`1A`/`Tudo`, a `ProventosPage` controla o estado de período com o tipo `DividendPeriod = '6M' | '1A' | 'Tudo'` e passa `onChange` e `value` ao seletor. Como o `PeriodSelector` aceita `WealthPeriod` (que inclui `6M`, `1A` e `Tudo`), a tipagem é compatível. A restrição aos três períodos fica na `ProventosPage` (não inicializa com `1M` ou `3M`). Se necessário, extrair `PERIODS` como prop para evitar render de botões inativos — mas só se o comportamento atual criar confusão visual.

**staleTime:** 5 minutos (dados de baixa frequência, alinhado com epic-3-context e `useWealthHistory`).

## Verification

**Commands:**
- `pnpm build` -- expected: compila sem erros de TypeScript
- `pnpm lint` -- expected: sem erros nos arquivos novos e em `routes.tsx`
- `pnpm test` -- expected: testes de `dividendCalculations.test.ts` passam

**Manual checks:**
- Acessar `/proventos` logado com posições: gráfico renderiza barras por mês e tabela exibe linhas
- Aplicar filtro por ticker: tabela filtra e total atualiza
- Trocar período: gráfico e tabela atualizam sem reload
- Exportar CSV: arquivo baixado com separador `;` e dados corretos

## Suggested Review Order

**Ponto de entrada — orquestração da tela**

- Página principal: orquestra hooks, estados, gráfico lazy + error boundary e CSV.
  [`ProventosPage.tsx:1`](../../src/modules/dividends/components/ProventosPage.tsx#L1)

**Contrato de dados e enriquecimento client-side**

- Tipos do módulo: `DividendPeriod`, `DividendRaw`, `DividendRow`, `MonthlyBar`, `DividendSort`.
  [`types.ts:1`](../../src/modules/dividends/types.ts#L1)

- Hook principal: orquestra duas queries (posições → tickers → dividendos) e enriquece client-side.
  [`useDividends.ts:1`](../../src/modules/dividends/hooks/useDividends.ts#L1)

- Service: query Supabase com filtros de ticker IN, ex_date e value_per_share > 0.
  [`dividendService.ts:1`](../../src/modules/dividends/services/dividendService.ts#L1)

**Lógica de agregação e filtragem**

- Funções puras: `buildMonthlyBars`, `filterAndSort` (case-insensitive), `sumTotalValue`.
  [`dividendCalculations.ts:1`](../../src/modules/dividends/utils/dividendCalculations.ts#L1)

- Constante de limite centralizada (service e CSV compartilham o mesmo valor).
  [`dividendConstants.ts:1`](../../src/modules/dividends/utils/dividendConstants.ts#L1)

**Componentes visuais**

- Gráfico de barras lazy-loaded com `ChartErrorBoundary` envolvendo o `Suspense`.
  [`DividendsBarChart.tsx:1`](../../src/modules/dividends/components/DividendsBarChart.tsx#L1)

- Tabela filtrável/ordenável com `aria-sort` e rodapé de total.
  [`DividendsTable.tsx:1`](../../src/modules/dividends/components/DividendsTable.tsx#L1)

**Exportação CSV**

- CSV com BOM UTF-8, separador `;`, `escapeCsvField`, max 500 linhas.
  [`dividendsCsv.ts:1`](../../src/modules/dividends/export/dividendsCsv.ts#L1)

**Utilitários compartilhados**

- `formatDividendDate` com fallback configurável — elimina duplicação entre tabela e CSV.
  [`formatDate.ts:1`](../../src/modules/dividends/utils/formatDate.ts#L1)

**Reutilização de componente existente**

- `PeriodSelector` estendido com prop `periods` opcional para subconjunto de períodos.
  [`PeriodSelector.tsx:1`](../../src/modules/wealth/components/PeriodSelector.tsx#L1)

- Rota `/proventos` conectada ao módulo real (substituição do placeholder).
  [`routes.tsx:14`](../../src/routes.tsx#L14)

**Testes**

- Testes das funções puras (buildMonthlyBars, filterAndSort incluindo case-insensitive, sumTotalValue).
  [`dividendCalculations.test.ts:1`](../../src/modules/dividends/utils/dividendCalculations.test.ts#L1)

- Testes de `_enrichRows` (cálculo de total_value, descarte de tickers sem posição) e `_periodToSince`.
  [`useDividends.test.ts:1`](../../src/modules/dividends/hooks/useDividends.test.ts#L1)

- Testes do `PeriodSelector` com e sem prop `periods` customizada.
  [`PeriodSelector.test.tsx:1`](../../src/modules/wealth/components/PeriodSelector.test.tsx#L1)
