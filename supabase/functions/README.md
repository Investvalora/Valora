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
| `sync-market-data` | 12 | **stub vazio** — sem código executável. Pode ser removida |
| `sync-br-assets` | 3 | **stub vazio** — substituída por `sync-b3-prices`. Pode ser removida |
| `sync-global-assets` | 2 | cotação atual de US/cripto; ver limitação abaixo |

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
