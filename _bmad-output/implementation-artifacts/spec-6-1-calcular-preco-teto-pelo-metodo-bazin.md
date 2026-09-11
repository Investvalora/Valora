---
title: 'Story 6.1 — Calcular Preço-Teto pelo Método Bazin'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'aef110ab2e21d119785a34df241822d00c586ecd'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** A rota `/estrategias` exibe um placeholder. Usuários não têm como calcular o preço-teto Bazin para os ativos da carteira, o que é necessário para identificar oportunidades de compra e sobrevalorização.

**Abordagem:** Criar o módulo `src/modules/valuation/` com funções puras de cálculo Bazin, um hook de orquestração e a página `/estrategias` com tabela de preço-teto, margem e indicador visual. O cálculo é inteiramente client-side e on-demand, sem persistência do resultado. O usuário informa o DY mínimo desejado e a tabela atualiza imediatamente via `useMemo`.

## Boundaries & Constraints

**Always:**
- Fórmula: `Preço-teto(ticker) = Σ value_per_share(últimos 12 meses) / DY_mínimo`. O dividendo anual é a soma do `value_per_share` de todos os registros de `dividends` onde `ticker = X` e `ex_date >= hoje - 365` e `ex_date <= hoje` e `value_per_share > 0`. Não usa `quantity` — o preço-teto é uma métrica por ação.
- Margem: `((teto − cotação) / cotação) × 100`. Positiva = abaixo do teto (oportunidade). Negativa = acima do teto (sobrevalorizado).
- Ativo sem dividendos nos últimos 12 meses → resultado `null` → célula exibe "N/A" com tooltip explicando o dado faltante. Nunca exibe "0" no lugar de "N/A".
- DY mínimo como estado local `useState<number>(6)` (o usuário digita em percentual; internamente converte para decimal: `minDY / 100`).
- Cálculo via `useMemo` (síncrono, client-side, AD-5/AD-9). Sem Edge Function, sem persistência.
- `dividendService.listDividendsByTickers` já existe — não modificar. Passar `shiftIsoDate(-365, new Date())` como `since`.
- `useLatestQuotes(tickers)` já existe — não modificar. Usar o campo `close` do `LatestQuote`.
- Ativo sem cotação exibe "—" no preço atual e "—" na margem; o preço-teto ainda é calculado se houver dividendos.
- `DIVIDENDS_LIMIT = 500` já definido — importar de `dividendConstants.ts`; não duplicar a constante.
- Padrão de página: seguir `ProventosPage` — estados separados loading/error/sem-posições/tela-completa.
- Ordenação padrão da tabela: margem decrescente (maior margem = maior oportunidade primeiro). Ativos com "N/A" vão ao fim. Segunda ordenação: ticker alfabético.
- Todas as modificações em arquivos existentes (`routes.tsx`) devem ser backward-compatible.

**Ask First:**
- Incluir ativos sem posição na carteira (busca livre por ticker) além dos da carteira do usuário.
- Persistir o DY mínimo do usuário em `user_preferences.valuation_method` ou em campo novo.
- Exibir o DY histórico calculado (dividendo_12m / cotação) ao lado do preço-teto.

**Never:**
- Modificar `dividendService.ts`, `useDividends.ts` ou `useLatestQuotes.ts`.
- Criar Edge Function para este cálculo.
- Persistir o resultado do cálculo no banco.
- Exibir preço-teto ou margem com mais de 2 casas decimais.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento | Tratamento de Erro |
|---------|---------------|----------------------|--------------------|
| Ativo com dividendos, cotação disponível | `Σ value_per_share = 2.40`, `minDY = 6%`, `close = 35.00` | Teto = R$ 40,00 · Margem = +14,3% · indicador verde | — |
| Ativo sem dividendos nos últimos 12 meses | tabela `dividends` sem registros no período | Coluna Dividendo 12M, Preço-Teto e Margem exibem "N/A"; tooltip "Sem histórico de dividendos nos últimos 12 meses" | — |
| Ativo com dividendos mas sem cotação | dividendos ok, `price_history` sem registro recente | Teto calculado, cotação exibe "—", margem exibe "—" | — |
| DY mínimo = 0 | usuário digita 0 | Input bloqueado com validação inline "DY mínimo deve ser maior que zero" | — |
| DY mínimo inválido (não numérico) | usuário limpa o campo | Input mostra erro, tabela congela no último valor válido | — |
| Usuário sem posições | `positions` vazia | Empty state "Nenhuma posição cadastrada" sem tabela | — |
| Erro de rede ao buscar dividendos | Supabase retorna erro | Mensagem inline com botão "Tentar novamente" | retry via `refetch()` |
| Cotação >20% acima do teto | `margem < -20%` | Indicador vermelho na célula de margem; sem alerta gerado nesta story | — |

</frozen-after-approval>

## Code Map

- `src/routes.tsx:17` — `EstrategiasPage` inline placeholder — substituir por import de `src/modules/valuation/components/EstrategiasPage`
- `src/modules/dividends/services/dividendService.ts` — `dividendService.listDividendsByTickers(tickers, since)` — reutilizar com `since = shiftIsoDate(-365, new Date())`; retorna `DividendRaw[]` com `value_per_share`
- `src/modules/dividends/utils/dividendConstants.ts` — `DIVIDENDS_LIMIT = 500` — importar, não duplicar
- `src/modules/dividends/types.ts:7` — `DividendRaw { ticker, type, ex_date, payment_date, value_per_share }` — tipo a usar como entrada das funções puras
- `src/modules/portfolio/hooks/useLatestQuotes.ts` — `useLatestQuotes(tickers)` — retorna `LatestQuote[]` com campo `close`; staleTime 60s; importar sem modificar
- `src/modules/portfolio/hooks/usePositions.ts` — `usePositions()` — fonte dos tickers da carteira
- `src/shared/utils/isoDate.ts:44` — `shiftIsoDate(days, reference?)` → string `YYYY-MM-DD`; usar para calcular `since`
- `src/modules/dividends/components/ProventosPage.tsx` — padrão canônico de página: estados loading/error/empty/full, `useHasPositions()`, `ChartErrorBoundary`
- `src/modules/score/utils/scoreCalculation.ts` — padrão canônico de funções puras: guarda `!Number.isFinite`, retorno `Map<string, T | null>`, nenhuma I/O
- `src/modules/valuation/types.ts` — **criar**: `BazinResult { ticker, annualDividend, ceilingPrice, currentPrice, margin, hasData }`
- `src/modules/valuation/utils/bazinCalculation.ts` — **criar**: `calcAnnualDividend(ticker, dividends): number`, `calcBazinCeiling(annualDividend, minDY): number | null`, `applyBazin(tickers, dividends, quotes, minDY): Map<string, BazinResult>`; funções puras
- `src/modules/valuation/utils/bazinCalculation.test.ts` — **criar**: cobrir happy path, N/A (sem dividendos), cotação ausente, DY inválido, múltiplos tickers
- `src/modules/valuation/hooks/useBazin.ts` — **criar**: `bazinQueryKey(userId, tickers)`, `useBazin(tickers)` — busca dividendos dos últimos 12 meses via `dividendService`; staleTime 5min; `useLatestQuotes(tickers)` para cotações; `useMemo` para calcular `Map<string, BazinResult>`
- `src/modules/valuation/components/EstrategiasPage.tsx` — **criar**: orquestra `usePositions`, `useBazin`, estado `minDY`, tabela ordenada; estados loading/error/empty/full

## Tasks & Acceptance

**Execução:**
- [x] `src/modules/valuation/types.ts` — definir `BazinResult { ticker: string; annualDividend: number; ceilingPrice: number | null; currentPrice: number | null; margin: number | null; hasData: boolean }` e `BazinByTicker = Map<string, BazinResult>`
- [x] `src/modules/valuation/utils/bazinCalculation.ts` — implementar `calcAnnualDividend(ticker, dividends)`, `calcBazinCeiling(annualDividend, minDY)` e `applyBazin(tickers, dividends, quotes, minDY)` como funções puras; guarda `!Number.isFinite` em todos os campos; resultado `null` para ativo sem dividendos
- [x] `src/modules/valuation/utils/bazinCalculation.test.ts` — cobrir todos os cenários da I/O matrix; incluir: ativo com dividendos (valor correto), ativo sem dividendos (null), cotação ausente (teto calculado, margem null), DY = 0 (null), múltiplos tickers, dividendos de tipos variados somados
- [x] `src/modules/valuation/hooks/useBazin.ts` — `bazinQueryKey(userId, tickers)`, `useBazin(tickers)`: query dividendos 12 meses + `useLatestQuotes` + `useMemo` com `applyBazin`; staleTime 5min; `enabled: Boolean(userId) && tickers.length > 0`
- [x] `src/modules/valuation/components/EstrategiasPage.tsx` — página completa: input DY mínimo (porcentagem, step=0.5, min=1, max=30, validação inline), tabela (Ticker | Dividendo 12M | Cotação | Preço-Teto | Margem | Indicador), ordenação por margem desc padrão, estados loading/error/sem-posições/vazio (sem dividendos)/tela-completa
- [x] `src/routes.tsx` — substituir placeholder `EstrategiasPage` inline por import de `./modules/valuation/components/EstrategiasPage`

**Acceptance Criteria:**
- Given ativo com `Σ value_per_share = 2.40` nos últimos 12 meses e DY mínimo = 6%, when a tela é exibida, then preço-teto = R$ 40,00 e margem = `((40 - cotação) / cotação) × 100`.
- Given ativo sem registros em `dividends` nos últimos 12 meses, when a tela é exibida, then as colunas Dividendo 12M, Preço-Teto e Margem exibem "N/A"; o tooltip da célula explica a ausência de dados.
- Given DY mínimo = 0 digitado pelo usuário, when valida, then exibe erro inline e não recalcula.
- Given cotação indisponível para um ativo, when a tabela é exibida, then cotação exibe "—" e margem exibe "—"; o preço-teto é calculado normalmente se houver dividendos.
- Given tabela com misto de ativos com e sem dado, when ordena por margem padrão, then ativos com maior margem (oportunidade) aparecem primeiro; ativos N/A ficam ao fim.
- Given usuário sem posições, when acessa `/estrategias`, then empty state "Nenhuma posição cadastrada" é exibido sem tabela.
- Given erro de rede ao buscar dividendos, when ocorre, then mensagem de erro com botão "Tentar novamente" é exibida.
- Given testes existentes de `PositionsTable`, `CarteiraPage` e `positionRows`, when o build roda, then todos continuam passando sem alteração.

## Design Notes

**`applyBazin` — estrutura de saída:**
```ts
// Para cada ticker:
// 1. Filtrar dividends pelo ticker
// 2. annualDividend = Σ value_per_share (pode ser 0 se sem registros)
// 3. hasData = annualDividend > 0
// 4. ceilingPrice = hasData ? annualDividend / minDY : null
// 5. currentPrice = close do LatestQuote ou null
// 6. margin = ceilingPrice && currentPrice ? ((ceilingPrice - currentPrice) / currentPrice) * 100 : null
```

**Input DY mínimo:**
```tsx
// Estado em porcentagem para o usuário (legível), conversão interna para decimal:
const [minDYPct, setMinDYPct] = useState<number>(6) // 6 = 6%
const minDY = minDYPct / 100 // 0.06 usado no cálculo
```

**Ordenação da tabela:**
```ts
// Ativos com margem definida primeiro, ordenados por margem DESC.
// Ativos sem margem (N/A) sempre ao fim, desempate por ticker.
function sortBazinResults(results: BazinResult[]): BazinResult[] {
  return [...results].sort((a, b) => {
    if (a.margin === null && b.margin === null) return a.ticker.localeCompare(b.ticker)
    if (a.margin === null) return 1
    if (b.margin === null) return -1
    const diff = b.margin - a.margin
    return diff !== 0 ? diff : a.ticker.localeCompare(b.ticker)
  })
}
```

**Indicador visual da margem:**
- Verde: `margin > 0` (cotação abaixo do teto → oportunidade)
- Vermelho: `margin <= 0` (cotação acima do teto → sobrevalorizado)
- Neutro: margem nula

## Verification

**Commands:**
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" build` -- expected: sem erros de TypeScript
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" lint` -- expected: sem erros nos arquivos novos e em `routes.tsx`
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" test --run` -- expected: todos os 457 testes existentes passam + novos de `bazinCalculation.test.ts`

**Manual checks:**
- Acessar `/estrategias` logado com posições que têm dividendos: tabela com preço-teto calculado
- Alterar DY mínimo: tabela recalcula imediatamente
- Digitar DY = 0: erro inline, tabela congela
- Ativo sem dividendos: "N/A" na linha

## Suggested Review Order

**Lógica pura de cálculo**

- Funções puras: calcAnnualDividend, calcBazinCeiling (com guard Infinity), calcMargin, applyBazin, sortBazinResults.
  [`bazinCalculation.ts:1`](../../src/modules/valuation/utils/bazinCalculation.ts#L1)

- Testes: 29 casos cobrindo happy path, N/A, cotação ausente, DY=0, Infinity, múltiplos tickers, ordenação.
  [`bazinCalculation.test.ts:1`](../../src/modules/valuation/utils/bazinCalculation.test.ts#L1)

**Contrato de tipos**

- BazinResult e BazinByTicker — campo `hasData` distingue "sem dividendos" de "score 0".
  [`types.ts:1`](../../src/modules/valuation/types.ts#L1)

**Orquestração de dados**

- Hook: query dividendos 12 meses + useLatestQuotes + useMemo; deps com JSON.stringify para key estável; effectiveDY derivado de minDYPct.
  [`useBazin.ts:1`](../../src/modules/valuation/hooks/useBazin.ts#L1)

**Página**

- Página completa: effectiveDY derivado (não segundo estado), sortedResults memoizado, validação de DY, estados loading/error/empty/full.
  [`EstrategiasPage.tsx:1`](../../src/modules/valuation/components/EstrategiasPage.tsx#L1)

- MarginIndicator com aria-label (WCAG 1.4.1); NaCell com Tooltip explicativo.
  [`EstrategiasPage.tsx:37`](../../src/modules/valuation/components/EstrategiasPage.tsx#L37)

**Rota**

- Substituição do placeholder inline pelo import real.
  [`routes.tsx:15`](../../src/routes.tsx#L15)
