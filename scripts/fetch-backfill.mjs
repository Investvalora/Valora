/**
 * Busca histórico 3mo de 10 tickers BR via brapi e gera 4 arquivos SQL
 * prontos para aplicar via Supabase MCP (batches de 160 rows cada).
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const lines = readFileSync(join(__dir, '../.env'), 'utf-8').split(/\r?\n/)
const env = Object.fromEntries(
  lines.flatMap(l => { const m = l.match(/^([^=]+)=(.*)$/); return m ? [[m[1].trim(), m[2].trim()]] : [] })
)

const BRAPI_KEY = env['BRAPI_KEY'] ?? ''
if (!BRAPI_KEY) { console.error('BRAPI_KEY não encontrada'); process.exit(1) }

const TICKERS = ['BBSE3','CXSE3','ITSA3','KLBN4','SAPR11','TOTS3','CPTS11','GARE11','VGHF11','XPSF11']
const sleep = ms => new Promise(r => setTimeout(r, ms))
const toIso = unix => new Date(Number(unix) * 1000).toISOString().slice(0,10)

const allRows = []  // { ticker, date, open, high, low, close, adjusted_close, volume }

for (const ticker of TICKERS) {
  try {
    const url = `https://brapi.dev/api/quote/${ticker}?range=3mo&interval=1d&token=${BRAPI_KEY}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const json = await res.json()
    if (json.error) throw new Error(json.message)
    const hist = json.results?.[0]?.historicalDataPrice ?? []
    let count = 0
    for (const p of hist) {
      if (!p.close || p.close <= 0) continue
      allRows.push({
        ticker,
        date:          toIso(p.date),
        open:          p.open          ?? p.close,
        high:          p.high          ?? p.close,
        low:           p.low           ?? p.close,
        close:         p.close,
        adjusted_close: p.adjustedClose ?? p.close,
        volume:        p.volume        ?? null,
      })
      count++
    }
    console.log(`${ticker}: ${count} pontos`)
  } catch(e) {
    console.error(`${ticker}: ERRO ${e.message}`)
  }
  await sleep(450)
}

console.log(`\nTotal: ${allRows.length} linhas`)

// gerar batches de SQL
const BATCH_SIZE = 160
const ON_CONFLICT = `ON CONFLICT (ticker, date) DO UPDATE SET
  open           = EXCLUDED.open,
  high           = EXCLUDED.high,
  low            = EXCLUDED.low,
  close          = EXCLUDED.close,
  adjusted_close = EXCLUDED.adjusted_close,
  volume         = EXCLUDED.volume,
  source         = EXCLUDED.source
WHERE price_history.source NOT IN ('b3_cotahist');`

for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
  const batch = allRows.slice(i, i + BATCH_SIZE)
  const values = batch.map(r => {
    const vol = r.volume !== null ? r.volume : 'NULL'
    return `('${r.ticker}','${r.date}',${r.open},${r.high},${r.low},${r.close},${r.adjusted_close},${vol},'brapi_backfill')`
  }).join(',\n')

  const sql = `INSERT INTO public.price_history (ticker, date, open, high, low, close, adjusted_close, volume, source)\nVALUES\n${values}\n${ON_CONFLICT}\n`

  const batchNum = Math.floor(i / BATCH_SIZE) + 1
  const outPath = join(__dir, `backfill-batch-${batchNum}.sql`)
  writeFileSync(outPath, sql, 'utf-8')
  console.log(`Batch ${batchNum}: ${batch.length} rows → ${outPath}`)
}
