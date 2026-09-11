---
title: 'Story 3.2 — Tela Patrimônio: Evolução, Composição e Exposição'
type: 'feature'
created: '2026-09-10'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'd98037e1c935775d9f67c57b7ebf02bee22d35bd'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Valora-2026-08-15/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A rota `/patrimonio` exibe apenas um placeholder. Usuários com posições e `price_history` não conseguem acompanhar a evolução do patrimônio nem ver a diversificação por classe de ativo.

**Approach:** Criar o módulo `wealth` com service, hook e página que calculam `Σ (cotação × quantidade)` por dia, reutilizam as regras de composição e exposição internacional do módulo `portfolio`, e renderizam o gráfico de linha e os cards de composição na rota existente.

## Boundaries & Constraints

**Always:** Patrimônio diário = `Σ (price_history.close × positions.quantity)` para cada ticker da carteira do usuário. Períodos disponíveis: 1M, 3M, 6M, 1A, Tudo. Dados incompletos (dias sem cotação) devem aparecer como lacunas na série — não interpolar. Composição e exposição internacional reutilizam `deriveComposition`, `assetClassLabel`, `assetClassColor` e `isInternationalClass` de `src/modules/portfolio/composition.ts`, sem duplicar lógica. O gráfico deve ser lazy-loaded via `React.lazy`. RLS em `price_history` e `positions` já garante que o usuário só vê os próprios dados.

**Ask First:** Usar `adjusted_close` em vez de `close`; calcular patrimônio server-side (view ou função); incluir posições encerradas (quantidade zero) na série histórica.

**Never:** Interpolar ou extrapolar cotações ausentes; consultar `dividends` ou `fundamentals` (são da Story 3.3); duplicar constantes de classificação de ativo; criar nova tabela ou migration; expor service_role no frontend.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|----------------------------|----------------|
| Usuário sem posições | `positions` vazia | Gráfico vazio com mensagem "Nenhuma posição cadastrada" | — |
| Posições sem histórico de preços | posições existem, `price_history` sem dados no período | Série vazia; lacuna total no gráfico | Mensagem "Dados históricos indisponíveis para o período" |
| Período com lacunas parciais | alguns tickers sem cotação em determinados dias | Dias sem cobertura completa aparecem como gap (ponto `null` na série) | — |
| Usuário com ativos USD (BDR/stock US/REIT) | posições com `type IN ('bdr','stock_us','reit')` | Exposição internacional calculada; cotação convertida para BRL | Fallback USD/BRL = R$ 5,00 se API falhar |
| Período "Tudo" com >365 pontos | histórico longo | Máximo 365 pontos; amostrar diariamente se precisar reduzir | — |
| Erro no fetch | Supabase retorna erro | Toast de erro; gráfico não renderiza; retry automático pelo TanStack | — |

</frozen-after-approval>

## Code Map

- `src/routes.tsx:14` -- placeholder `PatrimonioPage` inline — substituir por import real do módulo wealth
- `src/modules/portfolio/composition.ts` -- exporta `deriveComposition`, `assetClassLabel`, `assetClassColor`, `isInternationalClass`, `ClassBucket` — reutilizar integralmente; não duplicar
- `src/modules/portfolio/types.ts:137-150` -- `AssetClassKey`, `AssetClassSlice` — usar como tipos de retorno de composição
- `src/modules/portfolio/services/positionService.ts` -- padrão de service: objeto com métodos async, `supabase.from(...).select(...).eq(...)`, lança em erro, retorna `(data ?? []) as T`
- `src/modules/portfolio/hooks/usePositions.ts` -- padrão de hook: função de query key exportada separadamente, `useQuery` com `enabled: Boolean(userId)`
- `src/shared/services/supabaseClient.ts` -- importar `supabase` client
- `src/shared/services/usdRateService.ts` -- `usdRateService.getUSDRate()` retorna `USDRate { rate, source, isFallback }` — usar para converter preços USD→BRL
- `src/shared/hooks/useUSDRate.ts` -- `useUSDRate({ enabled })`, `usdRateQueryKey` — usar no hook de wealth em vez de chamar o service diretamente
- `src/shared/utils/isoDate.ts` -- `shiftIsoDate(days)`, `toIsoDate(date)` — calcular datas de início de período
- `src/shared/components/Layout.tsx` -- menu lateral já inclui `/patrimonio`; nada a alterar
- `src/modules/wealth/services/wealthService.ts` -- **criar**: `listPositionsWithHistory(userId, since)` — busca `positions` do usuário + `price_history` no período por join ou duas queries
- `src/modules/wealth/hooks/useWealthHistory.ts` -- **criar**: `wealthHistoryQueryKey(userId, period)`, hook TanStack Query que chama `wealthService` e deriva a série temporal
- `src/modules/wealth/components/WealthLineChart.tsx` -- **criar**: Recharts `ResponsiveContainer > LineChart` lazy-loaded, aceita `data: WealthPoint[]`
- `src/modules/wealth/components/PeriodSelector.tsx` -- **criar**: botões de período (1M/3M/6M/1A/Tudo), pode ser reutilizado na Story 3.3 e Épico 4
- `src/modules/wealth/components/CompositionCards.tsx` -- **criar**: cards de composição e card de exposição internacional; recebe saída de `deriveComposition`
- `src/modules/wealth/components/PatrimonioPage.tsx` -- **criar**: página principal; orquestra hooks, `useMemo` para derivações, subcomponentes acima
- `src/modules/wealth/types.ts` -- **criar**: `WealthPoint { date: string; value: number | null }`, `WealthPeriod` union type
- `src/modules/wealth/wealthCalculations.ts` -- **criar**: funções puras `buildWealthSeries` e `buildLastPricesMap` extraídas para testabilidade isolada

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/wealth/types.ts` -- definir `WealthPeriod` ('1M'|'3M'|'6M'|'1A'|'Tudo'), `WealthPoint { date: string; value: number | null }`, `PositionWithHistory` — estabelecer contrato de tipos do módulo
- [x] `src/modules/wealth/services/wealthService.ts` -- implementar `wealthService.listPositionsSnapshot(userId)` (posições atuais com ticker, quantity, asset type) e `wealthService.listPriceHistory(tickers, since)` (cotações diárias no período) — encapsular acesso ao Supabase; RLS garante isolamento
- [x] `src/modules/wealth/hooks/useWealthHistory.ts` -- implementar `wealthHistoryQueryKey(userId, period)` e `useWealthHistory(period)`: chama os dois métodos do service, deriva `WealthPoint[]` por dia usando `useMemo`, inclui `useUSDRate` para conversão USD→BRL de ativos internacionais — núcleo de dados da tela
- [x] `src/modules/wealth/components/PeriodSelector.tsx` -- botões 1M/3M/6M/1A/Tudo; ativo destacado; acessível (role group + aria-pressed) — controle de período reutilizável
- [x] `src/modules/wealth/components/WealthLineChart.tsx` -- `React.lazy` + `Suspense`; `ResponsiveContainer > LineChart` com `connectNulls={false}` (gaps reais); tooltip com valor BRL formatado com `Intl.NumberFormat`; `isAnimationActive={false}` — gráfico de evolução patrimonial
- [x] `src/modules/wealth/components/CompositionCards.tsx` -- recebe `AssetClassSlice[]` de `deriveComposition`; exibe cada classe com `assetClassLabel`, `assetClassColor`; card separado para exposição internacional (`isInternationalClass`); tooltip mostra valor R$ e ticker principal da classe — reutiliza lógica do portfolio sem duplicar
- [x] `src/modules/wealth/components/PatrimonioPage.tsx` -- orquestra `useWealthHistory`, `useState` para período selecionado, `useMemo` para `deriveComposition` sobre a última entrada da série; estados: loading (texto), erro (toast), vazio (mensagens distintas para sem posições vs sem histórico) — página completa da tela Patrimônio
- [x] `src/routes.tsx` -- substituir placeholder `PatrimonioPage` inline por `import { PatrimonioPage } from './modules/wealth/components/PatrimonioPage'` — conectar rota existente à implementação real

**Acceptance Criteria:**
- Given usuário com posições e `price_history` suficiente, when acessa `/patrimonio`, then gráfico de linha exibe série diária de patrimônio = `Σ (close × quantity)` para o período selecionado (padrão 1M).
- Given série com dias sem cotação, when o gráfico renderiza, then esses dias aparecem como lacuna (gap) e não como interpolação.
- Given período selecionado muda (ex.: de 1M para 6M), when usuário clica no seletor, then o gráfico e os cards atualizam sem recarregar a página.
- Given usuário tem ativos internacionais (BDR, stock US, REIT), when a tela carrega, then o card de exposição internacional exibe o percentual correto e o valor em BRL usando a taxa USD/BRL (com fallback R$ 5,00).
- Given cards de composição, when renderizados, then classes, cores e labels são idênticos aos da tela Carteira (mesma lógica de `deriveComposition`).
- Given usuário sem posições, when acessa a tela, then uma mensagem clara é exibida no lugar do gráfico.
- Given histórico de até 365 pontos, when o gráfico carrega, then o tempo de resposta é ≤3s (NFR-3).
- Given o gráfico, when renderiza, then usa `React.lazy` (lazy-loaded).

## Design Notes

**Cálculo da série temporal (client-side):**
```
// Para cada dia no período:
// 1. Pegar cotações disponíveis naquele dia (pode não existir para todos os tickers)
// 2. Se ALGUM ticker da carteira não tem cotação nesse dia → value = null (gap)
// OU: somar apenas os tickers com cotação disponível (mais permissivo)
// Decisão: usar a abordagem permissiva — somar os tickers com cotação no dia;
// dias em que price_history não tem NENHUM dado = null (gap total).
// Isso evita gaps artificiais por ativos recém-adicionados.
```

**Ativos internacionais:** `positions.type` não existe — o tipo vem de `assets.type` (join). `wealthService.listPositionsSnapshot` deve fazer join com `assets` para obter o tipo e assim identificar quais posições precisam de conversão USD→BRL.

**staleTime:** history = 5 minutos (baixa frequência, alinha com epic-3-context). usdRate já tem 1 hora via `useUSDRate`.

## Spec Change Log

**Review loop 1 — patches aplicados (sem bad_spec/intent_gap):**
- **Triggering findings:** usdRateQuery.isError não propagado; usdRate=0 não coberto por fallback; query key de histórico não incluía tickers; série all-null sem mensagem distinta.
- **Amended:** `useWealthHistory.ts` — (1) `isError` agora inclui `hasInternational && usdRateQuery.isError`; (2) `usdRate` usa `|| 5` em vez de `?? 5` para cobrir `rate === 0`; (3) `wealthHistoryQueryKey` recebe `tickers` como parâmetro. `PatrimonioPage.tsx` — (4) `emptyMessage` cobre `series.every(p => p.value === null)`.
- **Known-bad state avoided:** falha silenciosa de taxa USD; valor 0 BRL para ativos internacionais quando API retorna 0; composição desatualizada ao adicionar posição sem trocar período; gráfico renderizando sem conteúdo nem mensagem.
- **KEEP:** Abordagem permissiva de gaps; reutilização de `deriveComposition`; `React.lazy`; `connectNulls={false}`; separação em `wealthCalculations.ts`.

## Verification

**Commands:**
- `pnpm build` -- expected: compila sem erros de TypeScript
- `pnpm lint` -- expected: sem erros nos arquivos novos e em `routes.tsx`

**Manual checks (if no CLI):**
- Acessar `/patrimonio` logado com posições: gráfico renderiza com dados reais
- Trocar períodos: série atualiza corretamente
- Verificar DevTools Network: queries a `price_history` e `positions` com filtros de data e `user_id`


## Suggested Review Order

**Contrato de dados e cálculo**

- Tipos do módulo: `WealthPeriod`, `WealthPoint`, `PositionSnapshot`, `PriceHistoryRow`.
  [`types.ts:1`](../../src/modules/wealth/types.ts#L1)

- Funções puras exportadas: `buildWealthSeries` (série temporal) e `buildLastPricesMap` (último preço).
  [`wealthCalculations.ts:38`](../../src/modules/wealth/wealthCalculations.ts#L38)

- Service: join `positions + assets` para tipo/moeda; `listPriceHistory` com limite por tickers × 365.
  [`wealthService.ts:33`](../../src/modules/wealth/services/wealthService.ts#L33)

**Orquestração e derivação**

- Query key inclui tickers para revalidar ao mudar carteira sem mudar período.
  [`useWealthHistory.ts:32`](../../src/modules/wealth/hooks/useWealthHistory.ts#L32)

- Hook principal: dois fetches + taxa USD/BRL; `isError` cobre falha de taxa; `usdRate || 5` cobre zero.
  [`useWealthHistory.ts:78`](../../src/modules/wealth/hooks/useWealthHistory.ts#L78)

**Página e componentes**

- Ponto de entrada da tela: orquestra hook, `deriveComposition` e estados (loading/erro/vazio/all-null).
  [`PatrimonioPage.tsx:100`](../../src/modules/wealth/components/PatrimonioPage.tsx#L100)

- `buildCompositionInput`: constrói `PositionRow[]` mínimo para `deriveComposition` sem duplicar lógica.
  [`PatrimonioPage.tsx:57`](../../src/modules/wealth/components/PatrimonioPage.tsx#L57)

- Gráfico lazy-loaded com `connectNulls={false}`: gaps reais, sem interpolação.
  [`WealthLineChart.tsx:1`](../../src/modules/wealth/components/WealthLineChart.tsx#L1)

- Cards de composição reutilizam `assetClassLabel/Color/isInternationalClass` do portfolio.
  [`CompositionCards.tsx:1`](../../src/modules/wealth/components/CompositionCards.tsx#L1)

- Seletor de período acessível (`role=group`, `aria-pressed`); reutilizável nas stories 3.3 e Épico 4.
  [`PeriodSelector.tsx:1`](../../src/modules/wealth/components/PeriodSelector.tsx#L1)

**Roteamento e testes**

- Substituição do placeholder inline pela importação real.
  [`routes.tsx:12`](../../src/routes.tsx#L12)

- Testes unitários das funções puras cobrindo os 6 cenários da I/O matrix.
  [`wealthCalculations.test.ts:1`](../../src/modules/wealth/wealthCalculations.test.ts#L1)
