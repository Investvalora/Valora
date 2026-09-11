---
title: 'Story 6.2 — Alertas de Oportunidade e Sobrevalorização'
type: 'feature'
created: '2026-09-11'
status: 'done'
review_loop_iteration: 0
baseline_commit: '249882e3ab03821a10b196d1b9c5e10cfbc9e5d0'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-1-calcular-preco-teto-pelo-metodo-bazin.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** O botão "Atualizar alertas" da tela `/alertas` gera apenas alertas de inconsistência (posição sem transações, cotação desatualizada). Nenhum alerta é gerado quando um ativo está abaixo ou acima do preço-teto Bazin, deixando o usuário sem feedback sobre oportunidades de compra e sobrevalorização.

**Abordagem:** Estender a Edge Function `generate-alerts` — adicionando lógica Bazin em `logic.ts` e busca de dividendos em `index.ts` — para que o mesmo botão "Atualizar alertas" também gere alertas de oportunidade (`margin > 15%`) e sobrevalorização (`margin < -20%`). No frontend: adicionar os novos valores ao ENUM `alert_type`, criar migration para o banco e atualizar `AlertCard` para exibir o contexto Bazin.

## Boundaries & Constraints

**Always:**
- Limites fixos no MVP: oportunidade quando `margem > 15%` (cotação >15% abaixo do teto); sobrevalorização quando `margem < -20%` (cotação >20% acima do teto). Margem = `((teto − cotação) / cotação) × 100`.
- DY mínimo fixo na Edge Function: **6%** (0.06). Sem input do usuário na geração de alertas — a customização fica para Story 6.3 ou versão futura.
- Dividendo anual na Edge Function = soma dos `value_per_share` dos últimos 365 dias por ticker, exatamente como na Story 6.1.
- Cotação para o cálculo: `close` mais recente de `price_history` (já buscado em `index.ts` para os alertas existentes).
- Sem duplicatas: o UNIQUE INDEX `alerts_active_user_type_ticker_idx` (WHERE status <> 'ignorado') já previne isso. A função `insertAlert` existente já verifica e retorna `false` sem inserir se alerta ativo existir.
- A Edge Function **não usa `@supabase/supabase-js`** (causa BOOT_ERROR — ver README de `supabase/functions/`). Todas as chamadas ao banco via `fetch` direto ao PostgREST (padrão do `rest()` em `index.ts`).
- Ativar `verify_jwt=false` para manter consistência com as demais funções (o `authenticatedUser()` já valida o token manualmente).
- `alert_type` ENUM no banco: `ALTER TYPE` para adicionar `'opportunity'` e `'overvalued'`. Migration nova `012`.
- No frontend: `AlertType` em `src/modules/alerts/types.ts` ganha `'opportunity' | 'overvalued'`.
- Ativo sem dividendos nos últimos 365 dias: não gera alertas Bazin para esse ticker (skip silencioso).
- Ativo sem cotação recente: não gera alertas Bazin para esse ticker (skip silencioso).
- A Story 6.2 **não altera a EstrategiasPage** — o DY mínimo configurável na tela Estratégias e os alertas são recursos separados.

**Ask First:**
- Expor os limiares (15%/20%) como parâmetros configuráveis pelo usuário (ex: via `user_preferences`).
- Usar o DY mínimo salvo em `user_preferences` em vez do valor fixo de 6%.
- Gerar alertas Bazin também para ativos sem posição (watchlist futura).

**Never:**
- Modificar a função `authenticatedUser`, `response`, `rest` ou `insertAlert` em `index.ts` — elas funcionam e não precisam de alteração.
- Usar `@supabase/supabase-js` na Edge Function.
- Alterar a tabela `alerts` além do ENUM (sem novas colunas nesta story).
- Modificar a lógica existente de `findAlertCandidates` em `logic.ts` — apenas adicionar uma nova função exportada.
- Gerar alerta se `annualDividend <= 0` ou se não há cotação válida.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento | Tratamento |
|---------|---------------|----------------------|--------------------|
| Oportunidade: margem > 15% | teto = R$40, cotação = R$33 → margem ≈ 21% | Alerta `opportunity` inserido com título e descrição | — |
| Sobrevalorizado: margem < -20% | teto = R$30, cotação = R$38 → margem ≈ -21% | Alerta `overvalued` inserido | — |
| Margem entre -20% e 15% | teto = R$40, cotação = R$38 → margem ≈ 5% | Nenhum alerta Bazin gerado | — |
| Ticker sem dividendos nos últimos 365 dias | `Σ value_per_share = 0` | Skip silencioso, sem alerta | — |
| Ticker sem cotação em `price_history` | nenhum registro de close disponível | Skip silencioso, sem alerta | — |
| Alerta ativo já existente (mesmo tipo + ticker) | `alerts_active_user_type_ticker_idx` UNIQUE | `insertAlert` retorna `false`, sem duplicata | — |
| DY mínimo = 6% produz teto = 0 | annualDividend = 0 | Skip — sem teto calculável | — |
| Cotação negativa ou zero em price_history | `close <= 0` | Skip para esse ticker | — |

</frozen-after-approval>

## Code Map

- `supabase/migrations/008_create_alerts.sql:3` — ENUM `alert_type ('position_no_transactions', 'stale_quote')` — precisa de `'opportunity'` e `'overvalued'`; migration `012` faz o `ALTER TYPE`
- `supabase/functions/generate-alerts/logic.ts` — `findAlertCandidates`: função existente a não modificar; **criar** `findBazinAlertCandidates(positions, dividends, quotes, minDY, now?)` no mesmo arquivo como nova função exportada
- `supabase/functions/generate-alerts/index.ts:62+` — após buscar posições e cotações, adicionar busca de dividendos (`dividends?ticker=in.(...)&ex_date=gte.{since}&value_per_share=gt.0`) e chamar `findBazinAlertCandidates`; resultado concatenado ao loop de `insertAlert` existente
- `src/modules/alerts/types.ts:2` — `AlertType` union — adicionar `'opportunity' | 'overvalued'`
- `src/modules/alerts/components/AlertsPage.tsx` — `AlertCard` — adicionar renderização visual para os novos tipos (ícone/cor diferenciada para oportunidade vs. sobrevalorização)

## Tasks & Acceptance

**Execução:**
- [x] `supabase/migrations/012_extend_alert_type_enum.sql` — `ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'opportunity'; ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'overvalued';` — adicionar novos valores ao ENUM sem recriar a tabela
- [x] `supabase/functions/generate-alerts/logic.ts` — criar e exportar `findBazinAlertCandidates(positions, dividends, quotes, minDY, opportunityThreshold?, overvaluedThreshold?)`: calcula `annualDividend` por ticker, `ceilingPrice`, `currentPrice` e `margin`; retorna `AlertCandidate[]` com os novos tipos; `type` deve ser `'opportunity' | 'overvalued'` (literais de string aceitos pelo ENUM); adicionar testes unitários `logic.test.ts` cobrindo os 8 cenários da I/O matrix
- [x] `supabase/functions/generate-alerts/index.ts` — após a busca de cotações, buscar `dividends` dos últimos 365 dias para os tickers das posições; chamar `findBazinAlertCandidates`; concatenar candidatos no loop de `insertAlert` existente — sem duplicar lógica de autenticação ou `rest()`
- [x] `src/modules/alerts/types.ts` — adicionar `'opportunity' | 'overvalued'` ao union `AlertType`
- [x] `src/modules/alerts/components/AlertsPage.tsx` — `AlertCard`: adicionar estilo visual diferenciado para `opportunity` (verde/positivo) e `overvalued` (vermelho/negativo); exibir contexto Bazin na descrição (vem da Edge Function como campo `description`)

**Acceptance Criteria:**
- Given ativo com `Σ value_per_share = 2.40` nos últimos 365 dias e cotação = R$33, when "Atualizar alertas" é acionado, then alerta `opportunity` é criado com descrição contendo o preço-teto e a margem.
- Given ativo com cotação > 20% acima do teto, when "Atualizar alertas" é acionado, then alerta `overvalued` é criado.
- Given alerta `opportunity` já existente (status ≠ ignorado) para o mesmo ticker, when "Atualizar alertas" roda novamente, then nenhum duplicata é criada.
- Given ativo sem dividendos nos últimos 365 dias, when "Atualizar alertas" é acionado, then nenhum alerta Bazin é gerado para esse ticker.
- Given ativo sem cotação recente, when "Atualizar alertas" é acionado, then nenhum alerta Bazin é gerado para esse ticker.
- Given testes existentes em `logic.test.ts` (se existirem) e em `alertGeneration.test.ts`, when o build roda, then todos continuam passando.
- Given `AlertCard` com alerta do tipo `opportunity`, when renderizado, then exibe estilo visual verde/positivo distinto dos alertas de inconsistência.

## Design Notes

**`findBazinAlertCandidates` — estrutura:**
```ts
// logic.ts — nova função exportada (não modifica findAlertCandidates)

export type BazinDividend = { ticker: string; value_per_share: number }

export function findBazinAlertCandidates(
  positions: AlertPosition[],
  dividends: BazinDividend[],
  quotes: Array<{ ticker: string; close: number }>,
  minDY: number = 0.06,
  opportunityThreshold: number = 15,   // %
  overvaluedThreshold: number = -20,   // %
): AlertCandidate[] {
  // 1. Construir Map<ticker, annualDividend> somando value_per_share
  // 2. Construir Map<ticker, close> do quotes mais recente por ticker
  // 3. Para cada posição:
  //    a. annualDividend do Map; se <= 0, skip
  //    b. close do Map; se ausente ou <= 0, skip
  //    c. ceilingPrice = annualDividend / minDY
  //    d. margin = ((ceilingPrice - close) / close) * 100
  //    e. if margin > opportunityThreshold → AlertCandidate com type='opportunity'
  //    f. if margin < overvaluedThreshold → AlertCandidate com type='overvalued'
}
```

**Busca de dividendos em `index.ts`:**
```ts
// Após buscar posições e antes do loop de insertAlert

const tickers = positions.map(p => p.ticker)
const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const tickerFilter = tickers.map(t => encodeURIComponent(t)).join(',')

const dividendsResponse = await rest(
  `dividends?ticker=in.(${tickerFilter})&ex_date=gte.${since}&value_per_share=gt.0&select=ticker,value_per_share`
)
if (!dividendsResponse.ok) throw new Error('Falha ao ler dividendos.')
const dividends = await dividendsResponse.json()

// Busca de close mais recente (price_history) — já existe por ticker no loop anterior
// Reutilizar o array `quotes` já populado (tem close? → adicionar close ao tipo AlertQuote)
// OU buscar price_history novamente com select=ticker,close,date para ter o close
```

**Nota sobre `AlertQuote`:** o tipo atual em `logic.ts` é `{ ticker: string; date: string }` — sem `close`. Será necessário estender para `{ ticker: string; date: string; close: number }` e atualizar a query em `index.ts` para incluir `close` no select de `price_history`.

**Descrição dos alertas:**
```
opportunity: "PETR4 está R$ 40,00 abaixo do preço-teto Bazin de R$ 40,00 (DY 6%). Margem de segurança: +21%."
overvalued:  "VALE3 está R$ 8,00 acima do preço-teto Bazin de R$ 30,00 (DY 6%). Margem: -21%."
```

## Verification

**Commands:**
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" build` -- expected: sem erros TypeScript
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" lint` -- expected: sem erros
- `pnpm -C "c:\Users\Samuel Leite\wkspaces\Valora" test --run` -- expected: todos os 486 testes existentes passam + novos de `logic.test.ts`

**Manual checks:**
- Aplicar migration 012 no banco dev e confirmar que `alert_type` aceita `opportunity` e `overvalued`
- Chamar a Edge Function manualmente com `supabase functions invoke generate-alerts` e confirmar novos alertas na tabela
- Abrir `/alertas` e confirmar visual diferenciado nos novos tipos de alerta

## Suggested Review Order

**Schema**

- Migration: ALTER TYPE para adicionar 'opportunity' e 'overvalued' ao ENUM, idempotente.
  [`012_extend_alert_type_enum.sql:1`](../../supabase/migrations/012_extend_alert_type_enum.sql#L1)

**Lógica pura (Edge Function)**

- Nova função pura `findBazinAlertCandidates`: soma dividendos, calcula teto e margem, decide tipo.
  [`logic.ts:44`](../../supabase/functions/generate-alerts/logic.ts#L44)

- Testes: oportunidade, sobrevalorizado, margem neutra, sem dividendos, sem cotação, cotação zero, múltiplos tickers, descrição com valores corretos.
  [`alertGeneration.test.ts:40`](../../src/modules/alerts/alertGeneration.test.ts#L40)

**Orquestração (Edge Function)**

- `index.ts`: busca dividendos 365 dias + chama `findBazinAlertCandidates`; `close` adicionado ao select de `price_history`.
  [`index.ts:62`](../../supabase/functions/generate-alerts/index.ts#L62)

**Frontend**

- `AlertType` com novos valores.
  [`types.ts:1`](../../src/modules/alerts/types.ts#L1)

- `AlertCard` com `ALERT_CONFIG`: border e ticker coloridos por tipo; badge de categoria.
  [`AlertsPage.tsx:1`](../../src/modules/alerts/components/AlertsPage.tsx#L1)
