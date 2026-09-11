---
title: 'Story 5.2 — Aplicar Score na Carteira'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'a014c46'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-1-criar-e-editar-regras-de-score.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** O módulo `score` criado na Story 5.1 produz e persiste regras, mas nada as aplica: a tela Carteira não exibe pontuação por ativo e não tem seletor de score. Usuários não conseguem identificar ativos alinhados com sua estratégia.

**Abordagem:** Adicionar ao módulo `score` um hook de cálculo client-side que consulta `fundamentals`, aplica as regras do score ativo e retorna um `Map<ticker, number | null>`. Na tela Carteira, inserir um seletor de score e passar os scores como prop opcional à `PositionsTable`, que exibe uma coluna adicional ordenável. Nenhuma Edge Function é necessária — o cálculo é apresentacional e vive no cliente (AD-5, AD-9).

## Boundaries & Constraints

**Always:**
- Cálculo inteiramente client-side: sem Edge Function, sem persistência do resultado (AD-9). O hook usa `useQuery` com `staleTime` de 5 minutos; o resultado não é gravado no banco.
- `fundamentals` é consultado com `SELECT ... WHERE ticker IN (tickers) ORDER BY reference_date DESC DISTINCT ON (ticker)` — apenas o registro mais recente por ticker. A query usa o Supabase client diretamente (padrão existente nos outros serviços do projeto).
- Ativo sem fundamentals exibe "N/A" na coluna de score; nunca bloqueia o render da linha.
- Fundamentals com `updated_at` > 90 dias exibem flag "⚠️ Dados antigos" em tooltip da célula de score.
- A coluna de score é opcional e ordenável (`PositionSortColumn` ganha `'score'`). Quando nenhum score está ativo, a coluna não aparece e o sort por score não tem efeito.
- `PositionRow` ganha campo opcional `score?: number | null` — `null` = sem fundamentals, `undefined` = score não selecionado. Nenhuma lógica existente de `derivePositionRows` precisa mudar; o enriquecimento com score ocorre em `useMemo` no `CarteiraPage`, após a derivação.
- Modificações em `PositionsTable` e `portfolio/types.ts` devem ser backward-compatible: props novas são opcionais e todos os testes existentes devem continuar passando sem alteração.
- O seletor de score na Carteira é um `<select>` ou botão simples que lista os nomes únicos de score do usuário (agrupados por `name` via `groupRulesByName`). Selecionar um score ativa o cálculo; deselecionar limpa a coluna.
- O cálculo deve completar em ≤ 1s para 50 ativos (NFR-2).

**Ask First:**
- Persistir a escolha de score ativo na Carteira em `user_preferences.default_score_rule_id` (sincronizando com a tela Score) versus manter como estado local da sessão na Carteira.
- Exibir barra de progresso ou pontuação máxima possível junto ao score.

**Never:**
- Criar Edge Function para o cálculo de score — é client-side por design (AD-5).
- Modificar `derivePositionRows` ou sua interface além do estritamente necessário.
- Quebrar nenhum teste existente dos módulos `portfolio` ou `score`.
- Exibir scores de ativos fora da carteira do usuário.
- Persistir o resultado do cálculo no banco.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento | Tratamento de Erro |
|---------|---------------|----------------------|--------------------|
| Score ativo, ativo com fundamentals | score selecionado, ticker presente em `fundamentals` | Coluna Score exibe pontuação numérica (ex: "+25") | — |
| Score ativo, ativo sem fundamentals | score selecionado, ticker ausente de `fundamentals` | Coluna Score exibe "N/A" | — |
| Score ativo, fundamentals com `updated_at` > 90 dias | dados antigos | Score exibido com flag "⚠️ Dados antigos" no tooltip da célula | — |
| Nenhum score selecionado | `activeScoreName = null` | Coluna Score não aparece; ordenação por score não tem efeito | — |
| Usuário sem regras de score | `rules = []` | Seletor de score ausente ou desabilitado na Carteira | — |
| Score com regras, fundamentals indisponível (erro de rede) | fetch `fundamentals` falha | Coluna Score exibe "N/A" para todos; erro inline abaixo do seletor com retry | Retry via `refetch()` |
| Score selecionado, lista ordenada por score | coluna Score visível | Linhas com score mais alto aparecem primeiro (desc); N/A vai ao fim | — |
| Score selecionado, rule `between` com limiar [5, 15], ativo com `pl = 10` | `pl` entre 5 e 15 | Regra contribui com seus `points` ao total | — |
| Operador `lt`, ativo com `roe = 8`, limiar `threshold_min = 10` | `roe < 10` → verdadeiro | Regra contribui com seus `points` | — |

</frozen-after-approval>

## Code Map

- `src/modules/portfolio/types.ts:66` — `PositionSortColumn = 'ticker' | 'weight' | 'change'` — adicionar `'score'`; `PositionRow` — adicionar campo opcional `score?: number | null`
- `src/modules/portfolio/positionRows.ts:160+` — `sortPositionRows` — adicionar case para ordenação por `'score'`; rows com `score = null | undefined` vão ao fim no sort desc
- `src/modules/portfolio/components/PositionsTable.tsx:1` — adicionar prop opcional `scoreByTicker?: Map<string, number | null>` e coluna "Score" condicional; cabeçalho `SortableHeader` reutilizado com `column="score"`
- `src/modules/portfolio/components/CarteiraPage.tsx:1` — adicionar seletor de score ativo (`activeScoreName: string | null`), `useFundamentals(tickers)`, `useCalculateScore(rules, fundamentals)` e enriquecer `sortedRows` com o campo `score`
- `src/modules/score/types.ts:1` — adicionar interface `FundamentalsRow { ticker, reference_date, pl, pvp, roe, dy, debt_equity, net_margin, updated_at }` e tipo `ScoreByTicker = Map<string, number | null>`
- `src/modules/score/services/fundamentalsService.ts` — **criar**: `fundamentalsService.listByTickers(tickers): Promise<FundamentalsRow[]>` — query `SELECT DISTINCT ON (ticker) ... FROM fundamentals WHERE ticker IN (...) ORDER BY ticker, reference_date DESC`
- `src/modules/score/hooks/useFundamentals.ts` — **criar**: `fundamentalsQueryKey(userId, tickers)`, `useFundamentals(tickers)` — `enabled: Boolean(userId) && tickers.length > 0`, `staleTime: 60 * 60 * 1000` (1h — dado de baixa frequência)
- `src/modules/score/utils/scoreCalculation.ts` — **criar**: função pura `applyScoreRules(rules, fundamentals)` → `Map<string, number | null>`; e `evaluateRule(rule, value): boolean`
- `src/modules/score/utils/scoreCalculation.test.ts` — **criar**: cobrir happy path, between, cada operador, N/A (ativo sem fundamentals), score com 0 regras
- `src/modules/score/hooks/useCalculateScore.ts` — **criar**: recebe `rules: ScoreRule[]` e `fundamentals: FundamentalsRow[]`, retorna `Map<string, number | null>` via `useMemo` — sem `useQuery`, cálculo síncrono puro

## Tasks & Acceptance

**Execução:**
- [x] `src/modules/score/types.ts` — adicionar `FundamentalsRow`, `ScoreByTicker`; manter todos os tipos existentes intactos
- [x] `src/modules/score/services/fundamentalsService.ts` — criar `fundamentalsService.listByTickers(tickers)` com DISTINCT ON (ticker), ORDER BY ticker, reference_date DESC; sem filtro de updated_at no banco (flag de "dados antigos" é client-side)
- [x] `src/modules/score/hooks/useFundamentals.ts` — criar `fundamentalsQueryKey`, `useFundamentals(tickers)` com `staleTime: 60 * 60 * 1000` e `enabled: tickers.length > 0`
- [x] `src/modules/score/utils/scoreCalculation.ts` — criar `evaluateRule(rule, value): boolean` e `applyScoreRules(rules, fundamentals): Map<string, number | null>`; lógica dos operadores: `lt: value < min`, `lte: value <= min`, `gt: value > min`, `gte: value >= min`, `between: min <= value <= max`
- [x] `src/modules/score/utils/scoreCalculation.test.ts` — cobrir todos os cenários da I/O matrix que dependem da lógica pura; incluir: cada operador, between (inclusive nos limites), ativo sem fundamentals, score vazio (0 regras), múltiplas regras somadas
- [x] `src/modules/score/hooks/useCalculateScore.ts` — criar hook que recebe `rules` e `fundamentals`, retorna `ScoreByTicker` via `useMemo`; sem `useQuery`
- [x] `src/modules/portfolio/types.ts` — adicionar `'score'` ao `PositionSortColumn`; adicionar campo `score?: number | null` ao `PositionRow`
- [x] `src/modules/portfolio/positionRows.ts` — adicionar case `'score'` em `sortPositionRows`: `desc` coloca maiores primeiro, `null/undefined` vão ao fim; `asc` coloca menores primeiro, `null/undefined` vão ao fim
- [x] `src/modules/portfolio/components/PositionsTable.tsx` — adicionar prop opcional `scoreByTicker?: Map<string, number | null>`; quando presente, renderizar coluna "Score" com cabeçalho `SortableHeader column="score"`, valor formatado (inteiro com sinal, ou "N/A"), e tooltip "⚠️ Dados antigos" quando `fundamentals.updated_at` > 90 dias
- [x] `src/modules/portfolio/components/CarteiraPage.tsx` — adicionar: `useScoreRules()`, `useScorePreferences()`, `useFundamentals(tickers)`, `useCalculateScore(activeRules, fundamentals)`; seletor de score (select ou botões); estado `activeScoreName: string | null`; enriquecer `sortedRows` com `score` via `useMemo`; passar `scoreByTicker` a `PositionsTable`

**Acceptance Criteria:**
- Given usuário com score ativo e posições com fundamentals, when acessa a Carteira, then coluna "Score" aparece com a pontuação de cada ativo.
- Given ativo sem fundamentals no banco, when a coluna Score está visível, then a célula exibe "N/A" e não bloqueia o render das demais posições.
- Given fundamentals com `updated_at` > 90 dias, when o usuário passa o cursor sobre a célula de score, then tooltip exibe "⚠️ Dados antigos".
- Given nenhum score selecionado (ou seletor limpo), when a Carteira renderiza, then a coluna Score não aparece e os testes existentes de `PositionsTable` continuam passando.
- Given coluna Score visível, when usuário clica no cabeçalho "Score", then a lista ordena por pontuação decrescente; segundo clique inverte para crescente; ativos com "N/A" ficam sempre ao fim.
- Given regra `gte` com `threshold_min = 10` e ativo com `pl = 12`, when o score é calculado, then a regra contribui com seus `points` ao total.
- Given regra `between` com `threshold_min = 5` e `threshold_max = 15` e ativo com `roe = 10`, when o score é calculado, then a regra contribui com seus `points`.
- Given cálculo para 50 ativos, when executado, then tempo ≤ 1s (NFR-2) — verificável pelo fato de ser síncrono em `useMemo`.
- Given usuário sem regras de score, when acessa a Carteira, then seletor de score está ausente ou desabilitado.

## Design Notes

**`evaluateRule(rule, value): boolean` — lógica dos operadores:**
```ts
// scoreCalculation.ts
function evaluateRule(rule: ScoreRule, value: number): boolean {
  const { operator, threshold_min: min, threshold_max: max } = rule
  if (operator === 'lt')      return value < min
  if (operator === 'lte')     return value <= min
  if (operator === 'gt')      return value > min
  if (operator === 'gte')     return value >= min
  if (operator === 'between') return max !== null && value >= min && value <= max
  return false
}
```

**`applyScoreRules` — Map de ticker → score:**
```ts
// Para cada ticker: buscar o fundamentals mais recente, iterar as regras,
// somar points das regras cujo evaluateRule retorna true.
// Ticker sem fundamentals → Map.set(ticker, null)
// Ticker com fundamentals mas 0 regras satisfeitas → Map.set(ticker, 0)
```

**Ordenação por score em `sortPositionRows`:**
```ts
// Rows com score null/undefined vão ao fim independentemente da direção.
// Empate em score → desempate por ticker (ordem alfabética).
```

**Campo `score` em `PositionRow` é opcional** — `undefined` quando score não está ativo. Isso evita alterar `derivePositionRows` e mantém todos os testes existentes de `positionRows.test.ts` intactos.

**Enriquecimento de rows na `CarteiraPage`:**
```ts
const scoredRows = useMemo(() => {
  if (!scoreByTicker) return sortedRows
  return sortedRows.map(row => ({ ...row, score: scoreByTicker.get(row.ticker) ?? null }))
}, [sortedRows, scoreByTicker])
```

## Verification

**Commands:**
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" build` -- expected: sem erros de TypeScript
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" lint` -- expected: sem erros nos arquivos novos e modificados
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" test --run` -- expected: todos os testes passam (incluindo os 432 existentes e os novos de scoreCalculation.test.ts)

**Manual checks:**
- Acessar `/carteira` logado com posições: sem score selecionado, coluna Score ausente
- Selecionar um score: coluna Score aparece com pontuações
- Clicar no cabeçalho Score: ordena desc; segundo clique asc; N/A sempre ao fim
- Ativo sem fundamentals: célula exibe "N/A"

## Suggested Review Order

**Lógica pura de cálculo**

- Função pura de avaliação de regras: operadores lt/lte/gt/gte/between, guarda para NaN/Infinity.
  [`scoreCalculation.ts:1`](../../src/modules/score/utils/scoreCalculation.ts#L1)

- Função pura de aplicação do score: Map de ticker → total de pontos ou ausência de dado.
  [`scoreCalculation.ts:46`](../../src/modules/score/utils/scoreCalculation.ts#L46)

- Testes: todos os operadores, between nos limites, ticker sem fundamentals, score 0, pontos negativos.
  [`scoreCalculation.test.ts:1`](../../src/modules/score/utils/scoreCalculation.test.ts#L1)

**Contrato de tipos**

- FundamentalsRow e ScoreByTicker adicionados; distinção null (sem dado) vs undefined (coluna oculta) em PositionRow.score.
  [`score/types.ts:58`](../../src/modules/score/types.ts#L58)

- PositionSortColumn += 'score'; PositionRow.score campo opcional documentado.
  [`portfolio/types.ts:76`](../../src/modules/portfolio/types.ts#L76)

**Acesso a dados**

- Service: query com ordem (ticker ASC, reference_date DESC) e dedup client-side para registro mais recente por ticker.
  [`fundamentalsService.ts:1`](../../src/modules/score/services/fundamentalsService.ts#L1)

- Hook: staleTime 1h, enabled guarda userId e tickers não-vazios, queryKey com tickers ordenados.
  [`useFundamentals.ts:1`](../../src/modules/score/hooks/useFundamentals.ts#L1)

- Hook de cálculo: useMemo puro, sem useQuery — retorna Map vazio quando rules ou fundamentals vazios.
  [`useCalculateScore.ts:1`](../../src/modules/score/hooks/useCalculateScore.ts#L1)

**Integração na CarteiraPage**

- Ponto-chave: enriquecimento com `score` ocorre ANTES da ordenação (enrichedRows → scoredRows), para que sortPositionRows veja o campo ao ordenar por score.
  [`CarteiraPage.tsx:87`](../../src/modules/portfolio/components/CarteiraPage.tsx#L87)

- Seletor de score: reset de sort só quando coluna ativa é 'score'; loading/error state do fundamentalsQuery.
  [`CarteiraPage.tsx:278`](../../src/modules/portfolio/components/CarteiraPage.tsx#L278)

**Extensão da tabela**

- Ordenação por score: branch 'score' em sortPositionRows com undefined→null coercion; INITIAL_DIRECTION score:'desc'.
  [`positionRows.ts:184`](../../src/modules/portfolio/positionRows.ts#L184)

- Coluna Score condicional: cabeçalho SortableHeader, células +N/-N/N/A, tooltip "⚠️ Dados antigos" via isStaleFundamentals.
  [`PositionsTable.tsx:213`](../../src/modules/portfolio/components/PositionsTable.tsx#L213)
