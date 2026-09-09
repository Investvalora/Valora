---
title: 'Story 2.3 — Visualizar Lista de Posições com Rastreabilidade'
type: 'feature'
created: '2026-09-08'
status: 'done'
baseline_commit: '2f1cf54b29b12c021e35e0307cba49db5cdc3965'
review_loop_iteration: 1
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Carteira (entregue na 2.2) só mostra ticker, nome, quantidade, preço médio e data. O usuário não vê quanto vale sua posição hoje, qual o peso de cada uma, quanto variou desde a compra, nem de onde veio a cotação — sem isso a carteira não responde "quanto eu tenho".

**Approach:** Estender `PositionsTable`/`CarteiraPage` com cotação atual (último `price_history.close`), valor de mercado, peso relativo, variação % e ordenação; converter posições em USD para BRL via um novo `useUSDRate` (cadeia BCB PTAX → AwesomeAPI → localStorage → R$ 5,00); e expor a procedência de cada cotação (source + data) num tooltip acessível, sinalizando cotação antiga. Cálculos (somas, peso, ordenação) no cliente; leitura direta de `price_history` sem migration nova.

## Boundaries & Constraints

**Always:**
- Rastreabilidade obrigatória: toda cotação exibida carrega ícone de info clicável (não hover-only) com `source` e a data da cotação. Nunca interpolar dado faltante — cotação ausente vira lacuna honesta (`—`), nunca `0`.
- Cotação antiga: sinaliza flag "⚠️ Cotação antiga" quando o último fechamento (`date`) está a mais de 1 **dia útil** de atraso (pula fim de semana; feriado B3 é limitação conhecida, ver deferred-work). Comparar pela `date` do fechamento (não `updated_at`); exibir ambos no tooltip.
- Conversão USD aplica-se a todo ativo com `assets.currency = 'USD'` (inclui `crypto`, não só `stock_us`/`reit`). Taxa em fallback → badge "taxa USD aproximada". `useUSDRate` retorna `{ rate, source, isFallback }`, `staleTime` 1h.
- Acesso a dados só via hooks TanStack Query; leitura de `price_history` com `enabled: Boolean(userId)` (RLS exige sessão autenticada). Query de cotação separada da de posições (ciclo de vida e falha independentes — falha de cotação não derruba a lista).
- Peso relativo e total da carteira calculados no pai (`CarteiraPage`) em BRL; valor de mercado e peso em BRL, preço médio e cotação na moeda do ativo.
- Degradar sem apagar: falha de cotação/USD não esvazia a lista em cache nem afirma "0 posições" (padrão dos banners da 2.2).
- Imports relativos (sem alias `@/`); `tsc -b` roda `strict`/`noUnusedLocals` — import não usado quebra o build. Contraste WCAG AA: piso `gray-400` (não `gray-500`) sobre `dark-bg`.

**Ask First:**
- Criar migration/view (`latest_prices`) para a cotação: só se a query client-side por dedupe se mostrar inviável. View precisa de `security_invoker=true` senão fura RLS — decisão humana.
- Alterar o formato de retorno de `usePositions`/`listPositions` da 2.2 (query já validada).

**Never:**
- Fora de escopo: composição por classe e pizza (2.4), CSV/`transactions` (2.5), alertas (2.6), export (2.7). Não criar `transactions` nem recálculo server-side aqui.
- Não usar `DISTINCT ON` via PostgREST (não suportado) nem `new Date('YYYY-MM-DD')` para datas (off-by-one em fuso negativo).
- Não confiar na AwesomeAPI como primária (429 QuotaExceeded observado); PTAX é a primária.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Posição BRL com cotação recente | `PETR4`, qtd 100, `close=32.10`, `date=hoje` | Cotação R$ 32,10; valor de mercado R$ 3.210,00; peso % do total; variação % vs preço médio | N/A |
| Posição USD | `AAPL` USD, `close=150`, taxa 5,12 | Valor de mercado convertido para BRL (150×qtd×5,12); cotação exibida em USD | N/A |
| Cotação antiga | último fechamento (`date`) > 1 dia útil atrás | Flag "⚠️ Cotação antiga" na linha; tooltip mostra source + data | N/A |
| Cotação de sexta vista na segunda | `date=sexta`, hoje=segunda | SEM flag (0 dias úteis de atraso — pula fim de semana) | N/A |
| Sem cotação no histórico | ticker sem linha em `price_history` na janela | Cotação/valor/peso/variação exibem `—`; posição continua listada | Lacuna honesta, sem `0` |
| Taxa USD em fallback | PTAX e AwesomeAPI falham | Usa localStorage ou R$ 5,00; badge "taxa USD aproximada" | Sem erro bloqueante |
| Falha ao buscar cotações | query de `price_history` erra | Lista permanece (cache/posições); cotações degradam para `—` | Não esvaziar a tabela |
| Ordenação | usuário troca peso → ticker → variação | Reordena client-side; `aria-sort` no header ativo | N/A |
| Isolamento por usuário | usuário sem sessão | Query desabilitada (`enabled`); nada é buscado | RLS + `enabled` |

</frozen-after-approval>

## Code Map

Frontend (base da 2.2 a estender):
- `src/modules/portfolio/components/PositionsTable.tsx` — L39-49 `formatMoney(value,currency)` (currency já é parâmetro), L61-74 `formatDate` (só DATE, precisa de outro formatador p/ TIMESTAMPTZ do tooltip), L76-81 `toNumber` (reusar p/ `close`), L104-121 `<thead>` 5 colunas, L124-135 map de linhas (ticker é `<th scope="row">`). **Alterar**: +4 colunas (cotação, valor de mercado, peso %, variação %), headers ordenáveis com `aria-sort`, formatador de %, tooltip por cotação, flag de cotação antiga. Manter apresentacional — receber linhas já derivadas.
- `src/modules/portfolio/components/CarteiraPage.tsx` — L12 `usePositions()`, L45-58 header (card de patrimônio entra após L58), L60-85 banners status/erro, L87-91 render que não apaga cache sob erro. **Alterar**: estado de ordenação, `useMemo` das linhas derivadas (total + peso + variação + conversão USD), card de patrimônio total, badge de taxa USD aproximada.
- `src/modules/portfolio/hooks/usePositions.ts` — L9-11 `positionsQueryKey`, padrão `enabled`/`isSessionLoading`. Referência para o novo hook de cotações.
- `src/modules/portfolio/services/positionService.ts` — L4 `POSITIONS_LIMIT=50`, L24-35 `listPositions`, L23 `sanitizeSearchTerm`. Adicionar leitura de `price_history`.
- `src/modules/portfolio/types.ts` — L2 `AssetCurrency`, L5 `AssetType`, L32-34 `PositionWithAsset`. Adicionar `LatestQuote { ticker, close, source, date, updated_at }`.

Criar:
- `src/shared/hooks/useUSDRate.ts` + `src/shared/services/usdRateService.ts` — cadeia BCB PTAX → AwesomeAPI → localStorage → 5,00; retorna `{ rate, source, isFallback }`; `staleTime` 1h. Spec: `ARCHITECTURE-SPINE.md:121-128` (AD-12). Criar diretório `src/shared/hooks/`.
- `src/shared/components/Tooltip.tsx` — clicável, `role="tooltip"`, `aria-describedby`, Escape fecha; padrão de a11y do `Modal.tsx` (`useId`, foco). Cuidado: `overflow-x-auto` da tabela recorta — posicionar por cima do container.
- `src/modules/portfolio/hooks/useLatestQuotes.ts` — `useQuery` chave `['portfolio','quotes', tickersOrdenados]`, `enabled: tickers.length>0`.

Banco (leitura, sem migration):
- `supabase/migrations/003_create_assets_price_history.sql` — `price_history(ticker, date, close NUMERIC(18,4) NOT NULL, adjusted_close, source, updated_at)`, índice `price_history_ticker_date_idx ON (ticker, date DESC)` (feito p/ esta query); RLS SELECT p/ `authenticated USING (true)`, `anon` sem grant. `assets.currency IN ('BRL','USD')`, `assets.type` enum de 6 valores.
- Query de cotação (sem `DISTINCT ON`): `.select('ticker,date,close,source,updated_at').in('ticker', tickers).gte('date', hoje-Nd).order('ticker').order('date',{ascending:false})`, deduplicar no cliente pegando a primeira ocorrência por ticker. O `gte('date')` evita trazer 12 meses × 50 tickers.

Testes:
- `src/test/supabaseMock.ts` — L37-51 `CHAIN_METHODS` **não** inclui `in`/`gte`; adicioná-los ou o builder estoura.
- `src/modules/portfolio/components/PositionsTable.test.tsx` — L27-31 `priceCell()` indexa `cells[2]`; +colunas quebra 3 testes — reancorar por header/`within(row)`.
- `vite.config.ts:11-33` — `TZ: 'America/Sao_Paulo'` fixado; testar fronteira de dia da flag ">1 dia".

## Tasks & Acceptance

**Execution:**
- [x] `src/modules/portfolio/types.ts` -- adicionar `LatestQuote` (`ticker, close, source, date, updated_at`) e um tipo de linha derivada (`PositionRow`) com valor de mercado/peso/variação em BRL -- tipos partilhados entre hook, service e tabela
- [x] `src/modules/portfolio/services/positionService.ts` -- adicionar `listLatestQuotes(tickers)` lendo `price_history` com `.in(...).gte('date', janela).order('ticker').order('date',desc)`, dedupe por ticker (maior `date`) -- sem `DISTINCT ON`; janela curta evita puxar 12 meses. `normalizeTickers()` exportado
- [x] `src/modules/portfolio/hooks/useLatestQuotes.ts` -- `useQuery` chave `['portfolio','quotes',tickers]`, `enabled: tickers.length>0 && Boolean(userId)` -- cotação independente das posições
- [x] `src/shared/services/usdRateService.ts` -- cadeia BCB PTAX → AwesomeAPI → localStorage → R$ 5,00; PTAX ausente em fim de semana/feriado usa última cotação (não é erro) -- retorna `{ rate, source, isFallback, date }`; nunca rejeita, abort em 8s
- [x] `src/shared/hooks/useUSDRate.ts` -- `useQuery` `staleTime` 1h sobre o service, `retry: false`, `{ enabled }` opcional -- consumido também por 2.4/Épicos 3-4
- [x] `src/shared/components/Tooltip.tsx` -- ícone info clicável, portal `position: fixed` (overflow-x-auto recortaria), `role="tooltip"`, `aria-describedby` só aberto, Escape fecha, foco do padrão `Modal`, clique-fora e reposição em scroll/resize -- rastreabilidade de source+data
- [x] `src/modules/portfolio/components/PositionsTable.tsx` -- +4 colunas (cotação, valor de mercado, peso %, variação %), formatador de % com sinal e cor (`green-400`/`red-400`), tooltip por cotação, flag "⚠️ Cotação antiga", headers ordenáveis com `aria-sort`; recebe `rows: PositionRow[]` já derivado -- mantém tabela apresentacional
- [x] `src/modules/portfolio/components/CarteiraPage.tsx` -- `useMemo` derivando linhas (total BRL, peso, variação, conversão USD) via `positionRows.ts`, estado de ordenação (peso decrescente default), card de patrimônio total após header, badge "taxa USD aproximada", ressalva de posições sem cotação; não apagar lista sob erro de cotação -- cálculos client-side
- [x] `src/test/supabaseMock.ts` -- adicionar `in` e `gte` a `CHAIN_METHODS` -- query de cotação precisa deles
- [x] `src/modules/portfolio/components/PositionsTable.test.tsx` -- reancorar asserções por header (`cellText(header)`) em vez de índice fixo -- novas colunas mudam a ordem
- [x] Testes da matriz de I/O -- `useUSDRate`/service (cadeia de fallback, `isFallback`, PTAX de fim de semana), `positionService.listLatestQuotes` (dedupe, janela `gte`, só tickers da carteira), derivação (`positionRows.test.ts`: valor de mercado BRL/USD, peso somando 100%, variação, lacuna honesta sem cotação), flag de cotação antiga na fronteira de dia (TZ São Paulo, `isoDate.test.ts`), `Tooltip` (abre por click, Escape fecha, `aria-describedby`) -- guards provados por mutação (12 mutações detectadas)

**Acceptance Criteria:**
- Dado um usuário com posições, quando acessa a Carteira, então cada linha exibe ticker, nome, quantidade, preço médio, cotação atual (último `price_history.close`), valor de mercado, peso relativo % e variação % desde a aquisição, e a soma dos pesos fecha em 100% (FR-7).
- Dada a lista, quando carrega, então a ordenação padrão é por peso decrescente e o usuário pode alternar para ticker e variação %, com `aria-sort` refletindo a coluna ativa.
- Dada uma cotação cujo último fechamento está a mais de 1 dia útil de atraso, quando a linha renderiza, então exibe "⚠️ Cotação antiga" e o tooltip de info mostra `source` e a data; uma cotação de sexta vista na segunda NÃO acende a flag (FR-25).
- Dada uma posição em USD, quando o valor de mercado é calculado, então usa `useUSDRate`; se PTAX e AwesomeAPI falharem, usa fallback e exibe badge "taxa USD aproximada" (AD-12).
- Dado um ticker sem cotação na janela, quando a linha renderiza, então cotação/valor/peso/variação exibem `—` e a posição continua listada (nunca `0`).
- Dado erro ao buscar cotações, quando ocorre, então a lista de posições permanece visível (não é esvaziada).
- Dado `pnpm build`, `pnpm lint` e `pnpm test:run`, quando rodam, então todos passam sem erro.

## Spec Change Log

- **2026-09-09 — iteração 1.**
  **Achados que dispararam:** (1) `intent_gap` — o AC dizia "cotação com `date` > 1 dia" em dias corridos; verificado que `STALE_QUOTE_DAYS=1` marca TODA posição BR como "⚠️ Cotação antiga" em toda segunda-feira (fechamento de sexta = 3 dias corridos) e pós-feriado, treinando o usuário a ignorar a flag. (2) `patch` (blind/edge/verification-gap) — card conta posição USD sem taxa como "sem cotação" (mensagem enganosa durante loading da taxa); `derivePositionRows` aceitava `conversion`/`quotePrice` ≤ 0 no total; `pickLatestPerTicker` não guardava `date` não-string; `formatTimestamp(null)` renderizaria epoch (31/12/1969); imports de tipo sem `import type`; teste de ordenação com fixtures que não distinguem peso/variação/ticker (prova só `aria-sort`); `Tooltip` sem flip vertical.
  **O que foi emendado:** AC e matriz renegociados por Samuel para "> 1 **dia útil**" (opção A1: pula fim de semana; feriado B3 documentado em deferred-work). Patches aplicados sem re-derivação total (implementação estava sólida e verificada).
  **Estado ruim evitado:** flag de alarme falso recorrente que anula a própria utilidade; valor estrangeiro ou cotação ≤ 0 entrando no patrimônio como real; procedência mentindo data de 1969; suíte de ordenação verde sem testar ordenação.
  **KEEP — deve sobreviver a qualquer re-derivação:** a separação query de cotação × query de posições; `missingValueCount` como ressalva visível do total; comparação por `date` e não `updated_at` na flag; dedupe por maior `date`; o `enabled` de `useUSDRate` gateado por `hasUSDPosition`.

## Design Notes

- **Query de cotação sem `DISTINCT ON`.** PostgREST não expõe `DISTINCT ON`. Uma query com `.in('ticker', tickers).gte('date', hoje-Nd)` ordenada por `(ticker, date desc)` e dedupe client-side (primeira ocorrência por ticker) resolve com uma única query para ≤50 tickers. A janela `gte` (ex.: 10 dias) é o que impede puxar a série inteira. Ativo fora da janela → sem cotação → lacuna (correto: US/REIT/cripto não têm refresh agendado). A view `latest_prices` fica para uma story futura (exigiria `security_invoker=true` p/ não furar RLS).
- **`date` vs `updated_at`.** A flag "cotação antiga" é sobre o dia do fechamento (`date`), não sobre quando a linha foi escrita (`updated_at`): numa ingestão de fim de semana `updated_at` é recente mas o `close` é de sexta. Tooltip mostra os dois; a flag olha `date`.
- **`useUSDRate` retorna objeto, não número.** O badge "taxa USD aproximada" depende de `isFallback`. Cadeia: BCB PTAX (oficial, sem chave/quota, CORS ok) → AwesomeAPI (429 observado, não é primária) → última taxa em localStorage → R$ 5,00 fixo (validado vs PTAX 2026-09-03 = 5,1253).

## Suggested Review Order

**Derivação e regras de negócio (o coração da story)**

- Entrada: onde o pai deriva linhas (cotação, valor, peso, variação) e orquestra cotação + taxa USD.
  [`CarteiraPage.tsx:66`](../../src/modules/portfolio/components/CarteiraPage.tsx#L66)

- Guards do valor de mercado: cotação e conversão só somam ao total se `> 0`; peso depende do total.
  [`positionRows.ts:104`](../../src/modules/portfolio/positionRows.ts#L104)

- Flag de cotação antiga por dia útil (renegociação desta iteração): sexta→segunda não acende.
  [`positionRows.ts:79`](../../src/modules/portfolio/positionRows.ts#L79)

- Aritmética de pregões que sustenta a flag; não conhece feriado B3 (ver deferred-work).
  [`isoDate.ts:66`](../../src/shared/utils/isoDate.ts#L66)

**Acesso a dados (cotação sem DISTINCT ON, taxa USD com fallback)**

- Última cotação por ticker: `.in().gte()` + dedupe por maior `date`, uma query só.
  [`positionService.ts:110`](../../src/modules/portfolio/services/positionService.ts#L110)

- Cadeia da taxa USD: BCB PTAX → AwesomeAPI → localStorage → R$ 5,00; nunca rejeita.
  [`usdRateService.ts:1`](../../src/shared/services/usdRateService.ts#L1)

- Hooks TanStack: query de cotação separada da de posições; `useUSDRate` gateado por carteira USD.
  [`useLatestQuotes.ts:1`](../../src/modules/portfolio/hooks/useLatestQuotes.ts#L1)

**UI e rastreabilidade**

- Tabela: +4 colunas, headers com `aria-sort`, tooltip de procedência, flag; recebe linhas prontas.
  [`PositionsTable.tsx:1`](../../src/modules/portfolio/components/PositionsTable.tsx#L1)

- Tooltip acessível em portal, com flip vertical quando estoura a viewport.
  [`Tooltip.tsx:46`](../../src/shared/components/Tooltip.tsx#L46)

- Card de patrimônio: total, ressalva de posições sem cotação, badge de taxa aproximada.
  [`CarteiraPage.tsx:129`](../../src/modules/portfolio/components/CarteiraPage.tsx#L129)

**Periféricos (tipos e testes)**

- Tipos novos: `LatestQuote`, `PositionRow`, `PositionSort`.
  [`types.ts:1`](../../src/modules/portfolio/types.ts#L1)

- Mock do Supabase ganhou `in`/`gte` para a query de cotação.
  [`supabaseMock.ts:37`](../../src/test/supabaseMock.ts#L37)

- Teste de ordenação com 3 posições que distinguem peso/variação/ticker.
  [`CarteiraPage.test.tsx:545`](../../src/modules/portfolio/components/CarteiraPage.test.tsx#L545)