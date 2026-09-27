/**
 * Backfill histórico de preços BR (3 meses) para tickers sem histórico.
 * Usa brapi.dev (plano free: max 3mo) e insere via PostgREST.
 *
 * Uso: node scripts/backfill-br-history.mjs
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── ler .env ──────────────────────────────────────────────────────────────
function readEnv() {
  const envPath = join(__dirname, '..', '.env')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  const env = {}
  for (const line of lines) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

const env = readEnv()
const BRAPI_KEY = env['BRAPI_KEY'] ?? ''
const SUPABASE_URL = env['VITE_SUPABASE_URL'] ?? ''
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] ?? env['VITE_SUPABASE_ANON_KEY'] ?? ''

if (!BRAPI_KEY) { console.error('BRAPI_KEY não encontrada no .env'); process.exit(1) }
if (!SUPABASE_URL) { console.error('VITE_SUPABASE_URL não encontrada no .env'); process.exit(1) }

// ── tickers a fazer backfill ──────────────────────────────────────────────
const TICKERS = [
  'BBSE3', 'CXSE3', 'ITSA3', 'KLBN4', 'SAPR11', 'TOTS3',  // stock_br
  'CPTS11', 'GARE11', 'VGHF11', 'XPSF11',                   // fii
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── brapi: buscar histórico 3mo ───────────────────────────────────────────
async function fetchHistory(ticker) {
  const url = `https://brapi.dev/api/quote/${ticker}?range=3mo&interval=1d&token=${BRAPI_KEY}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`brapi ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = await res.json()
  if (json.error) throw new Error(`brapi error: ${json.message}`)
  return json.results?.[0]?.historicalDataPrice ?? []
}

// ── converter unix timestamp → ISO date ──────────────────────────────────
function toIsoDate(unixSeconds) {
  const d = new Date(unixSeconds * 1000)
  return d.toISOString().slice(0, 10)
}

// ── upsert no Supabase via PostgREST ─────────────────────────────────────
async function upsert(rows) {
  if (rows.length === 0) return
  const url = `${SUPABASE_URL}/rest/v1/price_history?on_conflict=ticker,date`

  // Se temos service role key, usamos ela. Senão usamos anon (pode falhar com RLS)
  const key = SERVICE_KEY
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`upsert ${res.status}: ${text.slice(0, 200)}`)
  }
}

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Iniciando backfill para ${TICKERS.length} tickers BR (3 meses)…\n`)

  let totalRows = 0
  const errors = []

  for (const ticker of TICKERS) {
    try {
      process.stdout.write(`  ${ticker}: buscando… `)
      const hist = await fetchHistory(ticker)

      if (hist.length === 0) {
        console.log('0 pontos (sem histórico)')
        continue
      }

      const rows = hist
        .filter(p => p.close && p.close > 0)
        .map(p => ({
          ticker,
          date: toIsoDate(p.date),
          open: p.open ?? p.close,
          high: p.high ?? p.close,
          low: p.low ?? p.close,
          close: p.close,
          adjusted_close: p.adjustedClose ?? p.close,
          volume: p.volume ?? null,
          source: 'brapi_backfill',
        }))

      await upsert(rows)
      totalRows += rows.length
      console.log(`${rows.length} pontos inseridos (${rows[0].date} → ${rows[rows.length - 1].date})`)
    } catch (err) {
      console.log(`ERRO: ${err.message}`)
      errors.push({ ticker, error: err.message })
    }

    // pausa entre tickers para não estourar rate limit brapi
    if (TICKERS.indexOf(ticker) < TICKERS.length - 1) await sleep(400)
  }

  console.log(`\n✓ Backfill concluído: ${totalRows} linhas inseridas`)
  if (errors.length > 0) {
    console.log(`✗ Erros (${errors.length}):`)
    for (const e of errors) console.log(`  ${e.ticker}: ${e.error}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
