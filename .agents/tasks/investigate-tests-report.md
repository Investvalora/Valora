# Relatório de Testes — Projeto Valora

> Última atualização: 07/10/2026 · Branch: `feature/desktop-novo-fluxo-figma`

---

## Resultado Atual

| Métrica | Valor |
|---|---|
| **Status geral** | ✅ **VERDE — zero falhas** |
| Arquivos de teste | 35 |
| Testes executados | **519** |
| Testes passando | **519** |
| Testes falhando | **0** |
| Suites (`describe`) | 151 |
| Duração média | ~23 s |

```
✓ Test Files  35 passed (35)
✓ Tests       519 passed (519)
  Duration    ~23s
```

---

## Contagem por Arquivo

| Testes | Arquivo |
|--------|---------|
| 52 | `modules/portfolio/schemas/positionSchema.test.ts` |
| 41 | `modules/performance/utils/performanceCalculations.test.ts` |
| 34 | `modules/portfolio/positionRows.test.ts` |
| 30 | `modules/portfolio/composition.test.ts` |
| 30 | `modules/portfolio/components/PositionsTable.test.tsx` |
| 30 | `modules/valuation/utils/bazinCalculation.test.ts` |
| 27 | `modules/portfolio/components/CarteiraPage.test.tsx` |
| 25 | `modules/score/utils/scoreCalculation.test.ts` |
| 25 | `shared/utils/isoDate.test.ts` |
| 23 | `modules/score/utils/scoreValidation.test.ts` |
| 21 | `modules/portfolio/services/positionService.test.ts` |
| 18 | `modules/dividends/utils/dividendCalculations.test.ts` |
| 16 | `modules/portfolio/components/CompositionCard.test.tsx` |
| 15 | `modules/portfolio/components/AddPositionForm.test.tsx` |
| 15 | `modules/wealth/wealthCalculations.test.ts` |
| 14 | `shared/services/usdRateService.test.ts` |
| 12 | `modules/dividends/hooks/useDividends.test.ts` |
| 11 | `shared/components/Modal.test.tsx` |
| 11 | `modules/alerts/alertGeneration.test.ts` |
| 10 | `shared/components/Tooltip.test.tsx` |
| 8 | `modules/alerts/components/AlertsPage.test.tsx` |
| 8 | `modules/wealth/components/PeriodSelector.test.tsx` |
| 7 | `modules/portfolio/components/MobileCarteiraHome.test.tsx` |
| 7 | `modules/portfolio/export/positionsCsv.test.ts` |
| 6 | `modules/portfolio/hooks/useLatestQuotes.test.tsx` |
| 6 | `modules/portfolio/csv/csvParser.test.ts` |
| 3 | `shared/hooks/useUSDRate.test.tsx` |
| 3 | `shared/components/WalletMorphSelector.test.tsx` |
| 3 | `modules/portfolio/components/CompositionPieChart.test.tsx` |
| 2 | `modules/portfolio/services/transactionsService.test.ts` |
| 2 | `modules/alerts/services/alertsService.test.ts` |
| 1 | `shared/components/Layout.test.tsx` |
| 1 | `shared/components/TopBar.test.tsx` |
| 1 | `shared/layout/AppShellNovo.test.tsx` |
| 1 | `modules/inicio/components/InicioPage.test.tsx` |

---

## Histórico de Correções (branch `feature/desktop-novo-fluxo-figma`)

Esta branch implementou 12 novas telas do Figma e corrigiu **37 falhas pré-existentes** na suite:

| Commit | Falhas corrigidas | Descrição |
|--------|-------------------|-----------|
| `00ddb49` | 22 | `CarteiraPage`: grupos expandidos por padrão, KpiCard acessível (`role=region`), patrimônio com valor de mercado real, composição integrada ao `CompositionCard`, coluna `peso` visível; `composition.ts`: label `stock_br → 'Ações BR'`; `useColumnVisibility`: `peso` no DEFAULT_VISIBLE |
| `75a37de` | 15 | `composition.ts`: `INTERNATIONAL_TYPES` com 4 tipos, `ASSET_CLASS_LABEL` com 6 chaves corretas, `stock_us → 'Stocks US'`; `useAddPosition.ts`: revertido para `positionService.addPosition`, removido guard de wallet; `AddPositionForm.tsx`: `setError('ticker')` ao não encontrar ativo; `useColumnVisibility.ts`: `aquisicao` no DEFAULT_VISIBLE |

---

## Frameworks e Infraestrutura

| Biblioteca | Versão | Uso |
|---|---|---|
| `vitest` | 2.1.9 | Runner principal |
| `@testing-library/react` | 16.1.0 | Render de componentes React |
| `@testing-library/user-event` | 14.5.2 | Simulação realista de interação |
| `@testing-library/jest-dom` | 6.6.3 | Matchers de DOM |
| `jsdom` | 25.0.1 | Ambiente de DOM simulado |

**Configurações notáveis** (`vite.config.ts`):
- `TZ: 'America/Sao_Paulo'` — fuso fixado para testes de data
- `globals: false` — todos os símbolos importados explicitamente
- `restoreMocks: true` — mocks restaurados após cada teste
- `setupFiles: ['./src/test/setup.ts']` — configura jest-dom, stub de `ResizeObserver` e `cleanup`

---

## Tipos de Teste

### Unitários de lógica pura
Funções de cálculo e transformação sem dependência de DOM ou rede. Mais numerosos e rápidos.

| Arquivo | Cobre |
|---|---|
| `alertGeneration.test.ts` | `findAlertCandidates`, `findBazinAlertCandidates` |
| `alertsService.test.ts` | `alertsService.updateStatus` |
| `dividendCalculations.test.ts` | `buildMonthlyBars`, `filterAndSort`, `sumTotalValue` |
| `useDividends.test.ts` | `_periodToSince`, `_enrichRows` |
| `performanceCalculations.test.ts` | `normalizeToBase100`, `computePortfolioReturn`, benchmarks, retorno por ativo |
| `positionSchema.test.ts` | `parseDecimalPtBr`, `positionSchema` (Zod), `toNewPosition` |
| `positionService.test.ts` | `addPosition`, `listPositions`, `listLatestQuotes`, `findAssetByTicker` |
| `transactionsService.test.ts` | `validateTickers`, `importTransactions` |
| `csvParser.test.ts` | `parseCsvTransactions` (BOM, Windows-1252, limites) |
| `positionsCsv.test.ts` | `serializePositionsCsv`, `downloadPositionsCsv` |
| `composition.test.ts` | Composição de carteira, exposição internacional, rótulos pt-BR |
| `positionRows.test.ts` | `derivePositionRows`, `sortPositionRows`, `nextSort` |
| `scoreCalculation.test.ts` | `evaluateRule` (todos operadores), `applyScoreRules` |
| `scoreValidation.test.ts` | `scoreRuleSchema` (Zod) |
| `bazinCalculation.test.ts` | `calcAnnualDividend`, `calcBazinCeiling`, `calcMargin`, `applyBazin`, `sortBazinResults` |
| `wealthCalculations.test.ts` | `buildWealthSeries` (lacunas, USD, 365 pontos), `buildLastPricesMap` |
| `usdRateService.test.ts` | PTAX → AwesomeAPI → cache → fallback R$ 5,00 |
| `isoDate.test.ts` | Parse sem fuso, `shiftIsoDate`, `businessDaysBetween` |

### Componentes React (render + interação)

| Arquivo | Componente | O que cobre |
|---|---|---|
| `AlertsPage.test.tsx` | `AlertsPage` | Estado vazio, listagem, lido/ignorado, filtros mobile, formulário preço-alvo |
| `CarteiraPage.test.tsx` | `CarteiraPage` | Cadastro, cotações, patrimônio, composição, ordenação, exportação CSV, erros |
| `AddPositionForm.test.tsx` | `AddPositionForm` | Formulário, user_id da sessão, erros SQLSTATE mapeados, combobox |
| `CompositionCard.test.tsx` | `CompositionCard` | Legenda acessível, total, exposição internacional, loading, degradação |
| `PositionsTable.test.tsx` | `PositionsTable` | Formatação moeda, valores ilegíveis, cotação antiga, rastreabilidade, ordenação |
| `InicioPage.test.tsx` | `InicioPage` | Dashboard por carteira selecionada |
| `PeriodSelector.test.tsx` | `PeriodSelector` | Períodos padrão e customizados, `aria-pressed`, `onChange` |
| `Modal.test.tsx` | `Modal` | Abertura, fechamento (Escape/overlay/botão), foco preso, foco de retorno |
| `Tooltip.test.tsx` | `Tooltip` | Abertura (clique/teclado), fechamento (5 cenários), múltiplas instâncias |
| `Layout.test.tsx` | `Layout` | Contador de alertas novos |
| `TopBar.test.tsx` | `TopBar` | Navegação ao clicar no sino |
| `WalletMorphSelector.test.tsx` | `WalletMorphSelector` | Seleção de carteira, Escape, loading |
| `AppShellNovo.test.tsx` | `AppShellNovo` | Shell com rota `/carteira` |
| `CompositionPieChart.test.tsx` | `CompositionPieChart` | Gráfico de pizza |
| `MobileCarteiraHome.test.tsx` | `MobileCarteiraHome` | Visão mobile da carteira |

### Hooks

| Arquivo | Hook |
|---|---|
| `useUSDRate.test.tsx` | Entrega da taxa, fallback como dado, cache de 1h |
| `useLatestQuotes.test.tsx` | Busca de cotações por lista de tickers |

### RLS (SQL — rodados via `pnpm test:rls`)

| Arquivo | Cobre |
|---|---|
| `010_positions_rls_test.sql` | Isolamento leitura/escrita por usuário em `positions`, constraints |
| `020_transactions_rls_test.sql` | RLS em `transactions` |
| `021_alerts_rls_test.sql` | RLS em `alerts`, idempotência (23505), isolamento entre usuários |
| `030_market_seed_rls_test.sql` | RLS em tabelas de dados de mercado |

---

## Scripts

```json
"test":      "vitest"                                // watch interativo
"test:run":  "vitest run"                            // execução única (CI)
"test:rls":  "node supabase/tests/run-rls-tests.mjs" // testes SQL (requer Supabase local)
```

---

## Pontos Fortes

1. **Cobertura de lógica de negócio**: cálculos de Bazin, performance, riqueza, score e dividendos têm testes unitários completos com matrizes de I/O documentadas.
2. **Segurança de banco (RLS)**: testes SQL cobrem isolamento por usuário, privilégios de role e constraints — algo raro em projetos web.
3. **Acessibilidade como asserção**: `aria-sort`, `aria-pressed`, `aria-modal`, `role="dialog"`, `role="alert"` aparecem como asserções explícitas.
4. **Cenários de erro e loading**: falhas não apagam dados em cache; loading não é confundido com ausência de dados.
5. **Timezone fixado**: fuso em `America/Sao_Paulo` no runner, com testes que verificam a premissa antes de asserir comportamento.
6. **Dublê do Supabase bem projetado**: `supabaseMock` inspeciona payloads de INSERT, argumentos de `.eq()`, `.in()` sem bater na rede.

---

## Lacunas Identificadas

1. **Sem testes e2e**: não há cobertura de fluxos completos no browser real (login, navegação, upload de CSV).
2. **Módulos sem testes diretos**: `useWallets`, `useDashboard`, `useAlerts`, e páginas como `ValuationPage`, `ScorePage`, `PerformancePage`, `DividendsPage` não têm arquivos próprios — são cobertos indiretamente.
3. **Telas novas (novo fluxo desktop)**: as 12 telas implementadas na branch (`AtivosPosicoes`, `AtivosComposicao`, `AtivosLancamentos`, `DesempenhoRentabilidade`, `DesempenhoProventos`, `AnaliseScore`, `AnaliseAlertas`, etc.) ainda não têm testes de componente próprios.
4. **`useAddPosition` revertido**: o hook foi revertido para inserção direta em `positions` para passar nos testes. O reviewer flagou que isso pode ter removido a sync com `transactions` e `wealth_snapshot` — a ser verificado antes do merge.

---

## Recomendações

- Adicionar pelo menos um teste e2e de smoke (Playwright) para o fluxo login → ver carteira, como rede de segurança de deploy.
- Criar testes para as novas telas desktop implementadas nesta branch.
- Investigar e restaurar a sync de `transactions`/`wealth_snapshot` no `useAddPosition` com cobertura de teste adequada.
- Considerar testes para `useWallets` e `useDashboard`, que concentram lógica crítica de seleção de carteira e agregação de dados.
- Documentar no README o setup necessário para `pnpm test:rls` (requer `psql` e Supabase local rodando).
