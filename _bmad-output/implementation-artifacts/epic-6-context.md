# Epic 6 Context: Preço-Teto e Detalhe de Ativos

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permitir que o usuário calcule o preço justo de cada ativo da carteira pelo método Bazin (Preço-teto = Dividendo anual por ação / DY mínimo desejado), identifique visualmente quais ativos estão baratos ou sobrevalorizados, receba alertas automáticos de oportunidade/sobrevalorização, e acesse uma tela de detalhe consolidada por ticker com histórico de preços, fundamentals, dividendos, score e posição.

## Stories

- Story 6.1: Calcular Preço-Teto pelo Método Bazin
- Story 6.2: Alertas de Oportunidade e Sobrevalorização
- Story 6.3: Tela de Detalhe do Ativo

## Requirements & Constraints

**Story 6.1 — Preço-Teto Bazin:**
- Fórmula: `Preço-teto = Σ value_per_share (últimos 12 meses) / DY_mínimo`. DY mínimo é definido pelo usuário (padrão sugerido: 6% = 0.06).
- `Σ value_per_share` usa a tabela `dividends` filtrada por ticker e `ex_date >= hoje-365`. Não depende de `quantity` — o preço-teto é por ação.
- Margem: `((teto − cotação) / cotação) × 100`. Verde quando cotação < teto, vermelho quando cotação > teto.
- Ativo sem dividendos nos últimos 12 meses exibe "N/A" com tooltip explicativo.
- Cálculo on-demand, client-side, sem persistir resultado (AD-5, AD-9). ≤2s para 50 ativos (NFR-7).
- Tela é `/estrategias` (hoje placeholder inline em `routes.tsx`).

**Story 6.2 — Alertas:**
- Reutiliza o fluxo `generate-alerts` da Story 2.6 (Edge Function existente).
- Alerta de oportunidade: cotação >15% abaixo do preço-teto.
- Alerta de sobrevalorização: cotação >20% acima do preço-teto.
- Tipo `opportunity` na tabela `alerts` (enum já existe).
- Sem duplicatas (mesmo tipo + ticker + user enquanto alerta ativo).

**Story 6.3 — Detalhe do ativo:**
- Rota nova (ex: `/ativo/:ticker`), acessível por clique no ticker da Carteira.
- Exibe: cotação com variação % do dia, gráfico de preços 12 meses, fundamentals, histórico de dividendos trimestrais, score (se ativo), preço-teto (se configurado), posição do usuário (se existir).
- Carrega em <2s para ativo com 12 meses de histórico (NFR-10).

**Segurança e dados:**
- `dividends`, `price_history`, `fundamentals`: tabelas de mercado, RLS com SELECT para `authenticated`, sem dado de usuário.
- `positions` e `alerts`: RLS por `user_id = auth.uid()`.

## Technical Decisions

**Cálculo Bazin client-side (AD-5, AD-9):**
Replicar o padrão de `scoreCalculation.ts` — funções puras em `src/modules/valuation/utils/bazinCalculation.ts`. Entrada: `DividendRaw[]` dos últimos 12 meses + `minDY: number`. Saída: `Map<string, BazinResult | null>`. Nenhuma chamada ao banco dentro das funções puras.

**Módulo `valuation` (novo):**
```
src/modules/valuation/
  types.ts              — BazinResult, etc.
  utils/bazinCalculation.ts
  utils/bazinCalculation.test.ts
  hooks/useBazin.ts     — orquestra positions + dividends + quotes
  components/EstrategiasPage.tsx
```

**Reutilização de serviços existentes:**
- `dividendService.listDividendsByTickers(tickers, since)` — já existe, só mudar `since` para `shiftIsoDate(-365, today)`.
- `useLatestQuotes(tickers)` — já existe no módulo portfolio, retorna `LatestQuote.close`.
- `usePositions()` — já existe, fornece a lista de tickers da carteira.

**Padrão de página:**
Seguir `ProventosPage`: estados loading/error/empty/full separados, `useHasPositions()` para distinguir "sem posições" de "sem dividendos". DY mínimo como estado local `useState<number>(0.06)`.

**`dividends.source` e FR-25:**
O campo `source` não está nas colunas selecionadas pelo `dividendService` atual. Para a Story 6.1 isso não é necessário (a rastreabilidade FR-25 é para cotações, não para o cálculo Bazin). Não alterar o service existente.

## UX & Interaction Patterns

- Input de DY mínimo: `<input type="number" step="0.5" min="1" max="30">` em porcentagem (o usuário digita "6" para 6%; o código converte para 0.06 internamente).
- Tabela: Ticker | Dividendo 12M (R$/ação) | Cotação atual | Preço-teto | Margem % | Indicador (verde/vermelho).
- Ordenação por margem decrescente como padrão (mostra oportunidades primeiro).
- Ativo com "N/A" sempre vai ao fim da ordenação.

## Cross-Story Dependencies

- **Story 3.1 (done):** tabela `dividends` com seed — pré-requisito para ter dados de teste.
- **Story 2.3 (done):** `useLatestQuotes` e padrão de rastreabilidade de cotação — reutilizado na Story 6.1.
- **Story 5.1 (review):** `user_preferences` com `valuation_method` já previsto no schema — Story 6.3 pode consultar esse campo.
- **Épico 5 (stories 5.1/5.2):** módulo `score` já existe — Story 6.3 consome `useScoreRules` e `useCalculateScore` para exibir score no detalhe.
- **Story 6.1 → 6.2:** a Edge Function `generate-alerts` existente deve ser estendida com a lógica Bazin na Story 6.2.
- **Story 6.1 → 6.3:** `BazinResult` calculado na Story 6.1 é reutilizado na tela de detalhe da Story 6.3.
