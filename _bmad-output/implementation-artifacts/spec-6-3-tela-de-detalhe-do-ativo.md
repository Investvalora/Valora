---
title: 'Story 6.3 — Tela de Detalhe do Ativo'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: '2789e9a837cb48321ee43d56a7951143176512b4'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** Ao clicar num ticker na tela Carteira, nada acontece — não existe rota `/ativo/:ticker` nem tela de detalhe. O usuário não consegue acessar em um único lugar cotação, histórico de preços, fundamentals, dividendos, score ativo e preço-teto Bazin de um ativo.

**Abordagem:** Criar o módulo `src/modules/assets/` com a página de detalhe `/ativo/:ticker`, um gráfico de linha de preços e os hooks necessários. Envolver o ticker em `PositionsTable` num `<Link>`. Consolidar dados de 5 fontes já existentes (cotação, histórico, fundamentals, dividendos, posição) com score e Bazin reutilizados dos módulos existentes.

## Boundaries & Constraints

**Always:**
- Rota: `ativo/:ticker` dentro do `<Layout />` (sidebar visível). Parâmetro via `useParams()`.
- Ticker normalizado para uppercase antes de qualquer query: `ticker.toUpperCase()`.
- Fonte de dados do ativo: `positionService.findAssetByTicker(ticker)` — retorna `Asset | null` com `ticker, name, type, currency`. Ativo inexistente no catálogo mostra mensagem "Ativo não encontrado no catálogo."
- Histórico de preços: `wealthService.listPriceHistory([ticker], since)` — reutilizar sem modificar. `since = shiftIsoDate(-365, new Date())` para 12 meses. PeriodSelector idêntico ao do Patrimônio (1M, 3M, 6M, 1A, Tudo).
- Fundamentals: `useFundamentals([ticker])` já existe em `src/modules/score/hooks/useFundamentals.ts` — reutilizar diretamente; staleTime 1h.
- Dividendos: `dividendService.listDividendsByTickers([ticker], '1970-01-01')` — histórico completo, ordenado desc; limite 500 (documentar como limitação). staleTime 5min.
- Cotação atual: `useLatestQuotes([ticker])` já existe; exibir `close`, `source`, `date`, `updated_at` com o mesmo tooltip de rastreabilidade da Story 2.3.
- Posição do usuário: `usePositions()` já existe; filtrar por ticker no `useMemo` client-side — não criar nova query.
- Score: `useScoreRules()` + `useScorePreferences()` + `useCalculateScore(activeRules, [fundamental])` — reutilizar sem modificação. Exibir apenas se `activeRuleId` existir em preferências.
- Preço-teto Bazin: `useBazin([ticker], 0.06)` — reutilizar sem modificação. DY fixo 6% (mesmo padrão da Story 6.1). Exibir sempre (não depende de configuração do usuário).
- `PriceLineChart`: criar em `src/modules/assets/components/PriceLineChart.tsx` baseado em `WealthLineChart.tsx` — mesma estrutura Recharts, mas eixo Y formatado pelo preço do ativo (sem R$ prefix, com precisão adequada), tooltip mostra `close` formatado na moeda do ativo.
- Link no ticker da `PositionsTable`: envolver `{row.ticker}` em `<Link to={/ativo/${row.ticker}}>` importando `Link` de `react-router-dom`. Manter os testes existentes de `PositionsTable` passando.
- Carrega em <2s (NFR-10): com `staleTime` adequado e queries em paralelo (sem waterfall), a page é fast enough para o seed.
- Origem dos dados via tooltip (FR-25): cotação, dividendo e fundamentals exibem `source` e `updated_at` exatamente como na Story 2.3.
- CTA: "Adicionar à Carteira" se o ticker não tiver posição; "Editar Posição" se tiver. Ao clicar, abre o modal `AddPositionForm` já existente (ou navega para Carteira — Ask First).

**Ask First:**
- O CTA "Adicionar/Editar Posição" abre o modal inline na tela de detalhe ou navega de volta para a Carteira?
- Exibir variação % do dia além da variação vs. preço médio (requer dois fechamentos consecutivos no `price_history`)?
- Paginação para o histórico de dividendos quando > 500 registros?

**Never:**
- Criar novo service para buscar `price_history` — reutilizar `wealthService.listPriceHistory`.
- Criar novo service para buscar fundamentals — reutilizar `fundamentalsService` via `useFundamentals`.
- Modificar `positionService`, `dividendService`, `fundamentalsService`, `useFundamentals`, `useScoreRules`, `useCalculateScore`, `useBazin` ou `WealthLineChart`.
- Exibir dados de posições de outro usuário.
- Criar nova tabela ou migration nesta story.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento | Tratamento |
|---------|---------------|----------------------|--------------------|
| Ativo no catálogo com todos os dados | ticker válido, posição, fundamentals, dividendos, cotação | Tela completa com todas as seções | — |
| Ticker não encontrado no catálogo | `findAssetByTicker` retorna null | Mensagem "Ativo não encontrado" + botão "Voltar" | — |
| Sem posição do usuário | ativo sem entrada em `positions` | Seção "Minha Posição" mostra "Você não tem posição neste ativo" + CTA "Adicionar à Carteira" | — |
| Sem fundamentals | `useFundamentals` retorna array vazio | Card fundamentals exibe "Sem dados fundamentalistas disponíveis" | — |
| Sem dividendos históricos | `dividendService` retorna array vazio | Seção dividendos exibe "Sem histórico de dividendos" | — |
| Sem score ativo | `default_score_rule_id = null` | Seção Score oculta | — |
| Sem cotação recente | `useLatestQuotes` retorna vazio | Cotação exibe "—" | — |
| Erro de rede em qualquer query | query falha | Seção afetada exibe erro inline com retry; outras seções continuam | Retry independente por seção |
| Ticker com letras minúsculas na URL | `/ativo/petr4` | Normaliza para `PETR4` antes de qualquer query | — |

</frozen-after-approval>

## Code Map

- `src/routes.tsx:37` — bloco `<Route path="/" element={<Layout />}>` — adicionar `<Route path="ativo/:ticker" element={<AtivoDetailPage />} />`; adicionar import de `AtivoDetailPage`
- `src/modules/portfolio/components/PositionsTable.tsx:~237` — `{row.ticker}` dentro de `<th scope="row">` — envolver em `<Link to={/ativo/${row.ticker}}>` de `react-router-dom`
- `src/modules/portfolio/services/positionService.ts:153` — `findAssetByTicker(ticker)` — reutilizar; retorna `Asset | null`
- `src/modules/wealth/services/wealthService.ts` — `listPriceHistory([ticker], since)` — reutilizar; retorna `PriceHistoryRow[]` com `ticker, date, close`
- `src/modules/score/hooks/useFundamentals.ts` — `useFundamentals([ticker])` — reutilizar; staleTime 1h; retorna `FundamentalsRow[]`
- `src/modules/score/hooks/useScoreRules.ts` — `useScoreRules()` + `groupRulesByName()` — reutilizar
- `src/modules/score/hooks/useScorePreferences.ts` — `useScorePreferences()` — reutilizar para `default_score_rule_id`
- `src/modules/score/hooks/useCalculateScore.ts` — `useCalculateScore(activeRules, fundamentals)` — reutilizar
- `src/modules/valuation/hooks/useBazin.ts` — `useBazin([ticker], 0.06)` — reutilizar; retorna `bazinByTicker`
- `src/modules/portfolio/hooks/usePositions.ts` — `usePositions()` — reutilizar; filtrar por ticker no `useMemo`
- `src/modules/portfolio/hooks/useLatestQuotes.ts` — `useLatestQuotes([ticker])` — reutilizar
- `src/modules/dividends/services/dividendService.ts` — `listDividendsByTickers([ticker], '1970-01-01')` — reutilizar
- `src/modules/dividends/types.ts` — `DividendRaw` — tipo para o histórico de dividendos
- `src/modules/wealth/components/WealthLineChart.tsx` — padrão canônico de gráfico de linha com Recharts — base para `PriceLineChart`
- `src/shared/components/Tooltip.tsx` — tooltip de rastreabilidade (FR-25) — reutilizar
- `src/shared/utils/isoDate.ts` — `shiftIsoDate`, `toIsoDate` — reutilizar
- `src/modules/wealth/components/PeriodSelector.tsx` — seletor de período — reutilizar com subset `['1M','3M','6M','1A','Tudo']`
- `src/modules/assets/types.ts` — **criar**: `PricePoint { date: string; close: number | null }`
- `src/modules/assets/services/assetDetailService.ts` — **criar**: `assetDetailService.getDividendHistory(ticker)` que chama `dividendService.listDividendsByTickers`; `getPriceHistory(ticker, since)` que chama `wealthService.listPriceHistory` — encapsula as chamadas para o módulo
- `src/modules/assets/hooks/useAssetDetail.ts` — **criar**: `useAssetDetail(ticker)` — TanStack Query com `positionService.findAssetByTicker`; staleTime 1h
- `src/modules/assets/hooks/usePriceHistory.ts` — **criar**: `priceHistoryQueryKey(ticker, period)`, `usePriceHistory(ticker, period)` — chama `wealthService.listPriceHistory`; staleTime 5min
- `src/modules/assets/hooks/useAssetDividends.ts` — **criar**: `assetDividendsQueryKey(ticker)`, `useAssetDividends(ticker)` — chama `dividendService`; since `'1970-01-01'`; staleTime 5min
- `src/modules/assets/components/PriceLineChart.tsx` — **criar**: gráfico de linha de preço do ativo; `data: PricePoint[]`; eixo Y na moeda do ativo; tooltip com data e close; `React.lazy` + `Suspense`
- `src/modules/assets/components/AtivoDetailPage.tsx` — **criar**: página orquestradora; usa `useParams()`, normaliza ticker; orquestra todos os hooks; renderiza seções: Hero (ticker/nome/tipo/cotação), Gráfico, Fundamentals, Dividendos, Score, Bazin, Minha Posição

## Tasks & Acceptance

**Execução:**
- [x] `src/modules/assets/types.ts` — definir `PricePoint { date: string; close: number | null }`
- [x] `src/modules/assets/hooks/useAssetDetail.ts` — `useAssetDetail(ticker)`: TanStack Query chamando `positionService.findAssetByTicker(ticker.toUpperCase())`; staleTime 1h; enabled: Boolean(ticker)
- [x] `src/modules/assets/hooks/usePriceHistory.ts` — `priceHistoryQueryKey(ticker, since)`, `usePriceHistory(ticker, period)`: mapeia `WealthPeriod` para `since` via `shiftIsoDate`; chama `wealthService.listPriceHistory`; staleTime 5min
- [x] `src/modules/assets/hooks/useAssetDividends.ts` — `assetDividendsQueryKey(ticker)`, `useAssetDividends(ticker)`: chama `dividendService.listDividendsByTickers([ticker], '1970-01-01')`; staleTime 5min; enabled: Boolean(ticker)
- [x] `src/modules/assets/components/PriceLineChart.tsx` — gráfico de linha com Recharts baseado em `WealthLineChart`; `data: PricePoint[]`; eixo Y sem prefixo BRL (formata pelo preço, ex: "R$ 35,42" no tooltip, "35" no eixo); `React.lazy`; `connectNulls={false}`; `isAnimationActive={false}`
- [x] `src/modules/assets/components/AtivoDetailPage.tsx` — página completa: normaliza ticker; orquestra `useAssetDetail`, `usePriceHistory`, `useFundamentals`, `useAssetDividends`, `useLatestQuotes`, `usePositions`, `useScoreRules`, `useScorePreferences`, `useCalculateScore`, `useBazin`; renderiza seções Hero, Gráfico (lazy), Fundamentals, Dividendos, Score, Bazin, Minha Posição; estados de loading/erro por seção
- [x] `src/modules/portfolio/components/PositionsTable.tsx` — importar `Link` de `react-router-dom`; envolver `{row.ticker}` em `<Link to={/ativo/${row.ticker}}>` com `hover:text-blue-400 transition-colors`
- [x] `src/routes.tsx` — importar `AtivoDetailPage`; adicionar `<Route path="ativo/:ticker" element={<AtivoDetailPage />} />` dentro de `<Route path="/" element={<Layout />}>`

**Acceptance Criteria:**
- Given usuário na tela Carteira, when clica num ticker, then navega para `/ativo/TICKER` com a tela de detalhe.
- Given ativo com todos os dados, when tela abre, then exibe nome, tipo, cotação atual com tooltip de rastreabilidade (FR-25).
- Given ticker com preços nos últimos 12 meses, when tela abre, then gráfico de linha exibe a série histórica com seletor de período.
- Given ativo com fundamentals no banco, when tela abre, then P/L, P/VP, ROE, DY, Dívida/PL e Margem Líquida são exibidos com `updated_at`.
- Given ativo com histórico de dividendos, when tela abre, then tabela lista `ex_date`, `type`, `value_per_share` ordenados por data desc.
- Given usuário com score ativo, when tela abre, then pontuação do ativo é exibida (ou "N/A" se sem fundamentals).
- Given qualquer ativo com posições, when tela abre, then seção "Minha Posição" exibe quantidade, preço médio, valor de mercado e variação %.
- Given ticker inexistente no catálogo, when tela abre, then mensagem "Ativo não encontrado" é exibida.
- Given ticker em minúsculas na URL, when tela abre, then queries são feitas com o ticker em maiúsculas.
- Given testes existentes de `PositionsTable` (30 testes), when o build roda, then todos continuam passando.

## Design Notes

**Orquestração sem waterfall — queries em paralelo:**
```
useAssetDetail(ticker)          → identidade do ativo
usePriceHistory(ticker, period) → gráfico (lazy)
useFundamentals([ticker])       → fundamentals card
useAssetDividends(ticker)       → tabela dividendos
useLatestQuotes([ticker])       → cotação atual
usePositions()                  → minha posição (filtrar client-side)
useScoreRules() + useScorePreferences() + useCalculateScore() → score
useBazin([ticker], 0.06)        → preço-teto
```
Todas as queries disparam simultaneamente no mount. Cada seção tem estado de loading/erro próprio e não bloqueia as outras.

**Seção Hero — estrutura:**
```
[Ticker badge] [Nome do ativo]         [Tipo] [Moeda]
R$ 35,42  ▲ +2,3%        ⓘ tooltip (fonte: brapi | date)
```

**Seção Fundamentals — tabela 2 colunas:**
```
P/L: 12,5   |  P/VP: 1,8
ROE: 15%    |  DY: 6,2%
Dívida/PL: 0,4 | Margem: 18%
```
Exibir `updated_at` com tooltip "Dados de [data]". Se todos os campos forem null → "Sem dados fundamentalistas."

**Seção Score — condicional:**
Exibir apenas quando `default_score_rule_id != null`. Mostrar nome do score + pontuação ou "N/A".

**Link no ticker da tabela:**
O `<Link>` não quebra `<th scope="row">` (é um elemento inline válido dentro de `<th>`). O CSS `hover:text-blue-400` dá feedback visual sem alterar o layout existente.

## Verification

**Commands:**
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" build` -- expected: sem erros TypeScript
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" lint` -- expected: sem erros
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" test --run` -- expected: todos os 494 testes existentes passam (especialmente `PositionsTable.test.tsx`)

**Manual checks:**
- Clicar num ticker na Carteira: navega para `/ativo/TICKER`
- Ticker em minúscula na URL: dados carregam normalmente
- Ticker inexistente: mensagem de erro sem crash
- Seletor de período: gráfico atualiza sem reload
- Todas as seções visíveis com dados do seed

## Suggested Review Order

**Entrada na navegação**

- Link no ticker: `<Link to={/ativo/${row.ticker}}>` com foco e hover acessíveis.
  [`PositionsTable.tsx:299`](../../src/modules/portfolio/components/PositionsTable.tsx#L299)

- Rota nova `/ativo/:ticker` dentro do `<Layout />`.
  [`routes.tsx:40`](../../src/routes.tsx#L40)

**Hooks de dados (todos sem modificação de serviços existentes)**

- Detalhe do ativo: `positionService.findAssetByTicker`, staleTime 1h, normaliza para uppercase.
  [`useAssetDetail.ts:1`](../../src/modules/assets/hooks/useAssetDetail.ts#L1)

- Histórico de preços: mapeia WealthPeriod → since, chama `wealthService.listPriceHistory`.
  [`usePriceHistory.ts:1`](../../src/modules/assets/hooks/usePriceHistory.ts#L1)

- Dividendos históricos: since='1970-01-01', limite 500 documentado.
  [`useAssetDividends.ts:1`](../../src/modules/assets/hooks/useAssetDividends.ts#L1)

**Gráfico**

- PriceLineChart: export default para React.lazy; eixo Y genérico; moeda via prop; connectNulls=false.
  [`PriceLineChart.tsx:1`](../../src/modules/assets/components/PriceLineChart.tsx#L1)

**Página**

- AtivoDetailPage: normaliza ticker, todas as 10 queries em paralelo (sem waterfall), 8 seções, erro por seção, ativo não encontrado exibe mensagem + botão voltar.
  [`AtivoDetailPage.tsx:1`](../../src/modules/assets/components/AtivoDetailPage.tsx#L1)

**Tipo**

- PricePoint: close nullable para representar gaps sem interpolação.
  [`types.ts:1`](../../src/modules/assets/types.ts#L1)

**Correção de testes**

- MemoryRouter adicionado aos wrappers de PositionsTable.test.tsx e CarteiraPage.test.tsx.
  [`PositionsTable.test.tsx:6`](../../src/modules/portfolio/components/PositionsTable.test.tsx#L6)
