# Edge Functions

## Procedência destes arquivos

Estas functions foram **recuperadas do servidor** em 2026-09-08, não escritas aqui.
Elas estavam deployadas e `ACTIVE` no projeto Supabase `zawjqzekqfnmvwglahnk` sem
nenhuma cópia no repositório — sem revisão, sem histórico e sem possibilidade de
rollback.

A recuperação foi feita via Management API (`GET /v1/projects/{ref}/functions/{slug}/body`),
que devolve um bundle ESZIP2.3. O `source/index.ts` foi extraído do bundle, então o
código abaixo é o **transpilado**, não necessariamente o fonte original: comentários
podem ter sido preservados, mas formatação e tipos TypeScript podem diferir do que
foi escrito originalmente.

| Function | Versão | Estado |
|---|---|---|
| `sync-b3-prices` | ativa | **Ingestão de preços B3 via COTAHIST oficial.** Agendada (pg_cron, seg–sex 22:00 UTC). Substitui `sync-br-assets` |
| `sync-brapi-prices` | ativa | **Atualização intradiária de cotações BR via brapi.dev.** Agendada 14×/dia (a cada 30min, 13h–19h30 UTC, seg–sex). Ver seção abaixo |
| `sync-bolsai-fundamentals` | ativa | **Fundamentais e dividendos BR via bolsai.dev.** Agendada 1×/dia (21h UTC, seg–sex). Ver seção abaixo |
| `sync-market-data` | 12 | **stub vazio** — sem código executável. Pode ser removida |
| `sync-br-assets` | 3 | **stub vazio** — substituída por `sync-b3-prices`. Pode ser removida |
| `sync-global-assets` | 2 | cotação atual de US/cripto; ver limitação abaixo |

## sync-brapi-prices (cotações intradiárias BR)

Busca cotação atual (`regularMarketPrice`, open, high, low, volume) de todos os
ativos BR ativos (`quote_provider = 'brapi'`) via `GET /api/quote/{tickers}` da
brapi.dev. Agrupa até 20 tickers por requisição para economizar cota. Upsert em
`price_history` com `source = 'brapi'` para a data do pregão corrente.

Funciona em complemento ao `sync-b3-prices`: durante o pregão atualiza os preços
ao vivo; à noite o COTAHIST grava o fechamento oficial e sobrescreve `source` para
`'b3_cotahist'`.

Agendamento em `supabase/migrations/013_schedule_brapi_intraday_sync.sql`:

| Job pg_cron | UTC | BRT | Momento |
|---|---|---|---|
| `sync-brapi-abertura` | 12:00 | 09:00 | Abertura |
| `sync-brapi-manha` | 14:00 | 11:00 | Meio da manhã |
| `sync-brapi-tarde` | 16:00 | 13:00 | Pós-almoço |
| `sync-brapi-pre-fechamento` | 18:00 | 15:00 | Pré-fechamento |

Consumo estimado: ~264 req/mês (< 2% do limite free de 15.000/mês).

Variáveis de ambiente necessárias:
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — padrão Supabase
- `BRAPI_KEY` — token da brapi.dev; configurar via `supabase secrets set BRAPI_KEY=<valor>`

Deploy:
```bash
supabase functions deploy sync-brapi-prices --project-ref <ref>
supabase secrets set BRAPI_KEY=<valor> --project-ref <ref>
```

## sync-b3-prices (fonte oficial B3)

Baixa o COTAHIST mensal da B3 (`bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_M{MMAAAA}.ZIP`),
parseia os registros de mercado à vista e faz upsert em `price_history` com
`source='b3_cotahist'`. Sem chave, sem quota — a B3 publica o arquivo aberto.

Decisões de implementação, todas motivadas por erro observado no deploy via
Management API (sem CLI, sem import map):

- **Não usa `@supabase/supabase-js`.** O import via esm.sh causava `BOOT_ERROR`.
  Isolado por bisseção: `Deno.serve` + TypeScript + `DecompressionStream` bootam;
  o SDK não. A function fala direto com o PostgREST via `fetch` + service role key.
- **Parsing em streaming.** Baixar e decodificar os ~83 MB de texto do arquivo de
  uma vez estourava `WORKER_RESOURCE_LIMIT`. A function descomprime com
  `DecompressionStream('deflate-raw')`, decodifica com `TextDecoderStream('latin1')`
  e quebra em linhas incrementalmente, guardando só as linhas dos tickers-alvo.
- **`Deno.serve` nativo**, não `std@0.168.0/http/server` (que dá BOOT_ERROR neste
  runtime quando publicado sem eszip).

Agendamento em `supabase/migrations/005_schedule_b3_price_sync.sql`. A service role
key fica no Vault (`vault.decrypted_secrets`), nunca no código versionado.

## Limitação de `sync-global-assets`

A function busca **cotação atual**, não série histórica:

- `finnhub.io/api/v1/quote` → preço do momento (`c`, `o`, `h`, `l`)
- `coingecko/simple/price` → apenas preço; ela preenche `open=high=low=close`, ou seja
  OHLC sintético
- grava sempre `date: new Date()`, uma linha por execução

Isso a torna adequada para **refresh diário**, e incapaz de satisfazer o AC da
Story 2.1, que pede série diária dos últimos 12 meses. Nenhum tier gratuito do
Finnhub entrega candles históricos — o endpoint de candles é pago.

Para o seed de 12 meses é preciso outra fonte:

- ações BR, FIIs, BDRs → **brapi** (`/api/quote/{ticker}?range=1y&interval=1d`,
  devolve `historicalDataPrice` com OHLCV + `adjustedClose`)
- stocks US, REITs → **Twelve Data** `/time_series` (free: 800 req/dia)
- cripto → **CoinGecko** `/market_chart`
- USD/BRL → **BCB PTAX** (oficial, sem chave, sem quota)

## Segurança

As três functions estavam com `verify_jwt = false`, ou seja, invocáveis publicamente
sem autenticação. Como elas escrevem no banco e consomem cota de API de terceiros
(brapi: 15.000 req/mês no plano gratuito), qualquer pessoa com a URL poderia esgotar
a cota do projeto.

Observação sobre o alcance da correção: ligar `verify_jwt` exige um JWT válido do
projeto, e a **anon key é um JWT válido**. Como a anon key é pública (vai no bundle
do frontend), `verify_jwt` bloqueia varredura anônima, mas não um atacante que leia
o JS da aplicação. Proteção real para função de ingestão exige segredo compartilhado
próprio ou remoção do acesso público.

## Deploy

Estas functions não são versionadas por migration. Para publicar mudanças:

```bash
supabase functions deploy sync-global-assets --project-ref zawjqzekqfnmvwglahnk
```

Secrets já configurados no projeto (valores não recuperáveis por API — são write-only):
`BRAPI_API_KEY`, `FINNHUB_API_KEY`, `COINGECKO_API_KEY`.

## sync-bolsai-fundamentals (fundamentos + dividendos diários)

Busca 27 indicadores fundamentalistas TTM e histórico de dividendos/JCP de
todos os ativos BR ativos (`stock_br`, `fii`, `bdr`) via API da bolsai.dev.
Upsert em `fundamentals` (snapshot diário TTM) e `dividends` (histórico completo).

Agendamento: **21h00 UTC (18h00 BRT)**, 1× por dia seg–sex.  
`timeout_milliseconds = 120000` — 27 ativos × 2 endpoints × 400ms pausa ≈ 22s de execução.

**Consumo:** 27 ativos × 2 endpoints = 54 req/execução (27% dos 200 req/dia free).

**Endpoints bolsai usados:**
- `GET /api/v1/fundamentals/{ticker}` → pl, pvp, roe, dy, net_margin, lpa, vpa, net_debt_ebitda
- `GET /api/v1/dividends/{ticker}` → payments[] com ex_date, payment_date, value_per_share, type

Deploy:
```bash
supabase functions deploy sync-bolsai-fundamentals --project-ref <ref>
supabase secrets set BOLSAI_KEY=<valor> --project-ref <ref>
```
