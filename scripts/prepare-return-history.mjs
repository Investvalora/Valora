/** Consulta somente dados públicos; gera SQL para revisão, sem acessar o banco.
 * node scripts/prepare-return-history.mjs --tickers=BBAS3.SA,SPHD --from=2024-11-01 --until=2026-10-27
 * Tickers Yahoo BR terminados em .SA são gravados sem o sufixo.
 * Preços existentes são preservados. Benchmarks substituem somente seeds.
 */
import { mkdir, writeFile } from 'node:fs/promises'
const options = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')))
const { from, until, tickers } = options
if (!/^\d{4}-\d{2}-\d{2}$/.test(from ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(until ?? '') || from > until) throw new Error('Informe --from e --until ISO válidos')
const symbols = (tickers ?? '').split(',').filter(Boolean)
if (!symbols.length || symbols.some(s => !/^[A-Z0-9.^-]+$/.test(s))) throw new Error('Informe --tickers Yahoo válidos')
const directory = options.output ?? 'output/return-history'
await mkdir(directory, { recursive: true })
const first = Date.parse(`${from}T00:00:00Z`) / 1000
const last = Date.parse(`${until}T00:00:00Z`) / 1000 + 86400
const statements = [], report = []
for (const symbol of symbols) {
  if (symbol === 'IFIX') continue // fonte oficial B3 abaixo
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${first}&period2=${last}&interval=1d`, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json(), chart = payload.chart?.result?.[0]
    if (!chart || payload.chart.error) throw new Error('Histórico indisponível')
    const expectedCurrency = symbol.endsWith('.SA') || symbol.endsWith('-BRL') || symbol === '^BVSP' ? 'BRL' : 'USD'
    if (chart.meta?.currency !== expectedCurrency) throw new Error('Moeda diferente da esperada; histórico não preparado')
    const ticker = symbol.replace(/\.SA$/, '').replace(/-USD$/, '')
    const rows = (chart.timestamp ?? []).flatMap((stamp, index) => {
      const date = new Date(stamp * 1000).toISOString().slice(0, 10)
      const close = chart.indicators?.quote?.[0]?.close?.[index]
      return date >= from && date <= until && Number.isFinite(close) && close > 0 ? [{ date, close }] : []
    })
    if (!rows.length) throw new Error('Sem fechamentos válidos')
    report.push({ symbol, currency: chart.meta?.currency, first: rows[0].date, last: rows.at(-1).date, rows: rows.length })
    for (let offset = 0; offset < rows.length; offset += 400) {
      const values = rows.slice(offset, offset + 400).map(r => symbol === '^BVSP' ? `('IBOV','${r.date}',${r.close},'yahoo_history')` : `('${ticker}','${r.date}',${r.close},'yahoo_history')`).join(',\n')
      statements.push(symbol === '^BVSP'
        ? `insert into public.benchmarks(name,date,value,source) values ${values} on conflict(name,date) do update set value=excluded.value,source=excluded.source where benchmarks.source in ('seed','synthetic');`
        : `insert into public.price_history(ticker,date,close,source) values ${values} on conflict(ticker,date) do nothing;`)
    }
  } catch (error) { report.push({ symbol, error: error.message }) }
}
// SGS 12: CDI efetivo diário em %; compõe um índice, sem usar taxa anual como diária.
try {
  const br = date => date.split('-').reverse().join('/')
  const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${br(from)}&dataFinal=${br(until)}`, { signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const payload = await response.json()
  let factor = 100
  const rows = payload.map(row => ({ date: row.data.split('/').reverse().join('-'), rate: Number(row.valor) })).sort((a, b) => a.date.localeCompare(b.date))
  if (!rows.length || rows.some(r => !Number.isFinite(r.rate) || r.rate <= -100 || r.date < from || r.date > until)) throw new Error('Resposta SGS inválida')
  const values = rows.map(row => { factor *= 1 + row.rate / 100; return `('CDI','${row.date}',${factor},'bcb_sgs12')` })
  for (let offset = 0; offset < values.length; offset += 400) statements.push(`insert into public.benchmarks(name,date,value,source) values ${values.slice(offset, offset + 400).join(',\n')} on conflict(name,date) do update set value=excluded.value,source=excluded.source where benchmarks.source in ('seed','synthetic','bcb_sgs12');`)
  report.push({ symbol: 'CDI/SGS12', rows: rows.length, first: rows[0].date, last: rows.at(-1).date })
} catch (error) { report.push({ symbol: 'CDI/SGS12', error: error.message }) }
try {
  const rows = []
  for (let year = Number(from.slice(0, 4)); year <= Number(until.slice(0, 4)); year++) {
    const params = Buffer.from(JSON.stringify({ index: 'IFIX', language: 'pt-br', year: String(year) })).toString('base64')
    const response = await fetch(`https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/${params}`, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    if (!Array.isArray(payload.results)) throw new Error('Resposta B3 inválida')
    for (const day of payload.results) for (let month = 1; month <= 12; month++) {
      const text = day[`rateValue${month}`]
      if (typeof text !== 'string' || !text.trim()) continue
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
      const value = Number(text.replace(/\./g, '').replace(',', '.'))
      if (date >= from && date <= until && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date && Number.isFinite(value) && value > 0) rows.push({ date, value })
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date))
  if (!rows.length) throw new Error('Sem fechamentos IFIX')
  for (let offset = 0; offset < rows.length; offset += 400) statements.push(`insert into public.benchmarks(name,date,value,source) values ${rows.slice(offset, offset + 400).map(r => `('IFIX','${r.date}',${r.value},'b3_index_history')`).join(',\n')} on conflict(name,date) do update set value=excluded.value,source=excluded.source where benchmarks.source in ('seed','synthetic');`)
  report.push({ symbol: 'IFIX/B3', rows: rows.length, first: rows[0].date, last: rows.at(-1).date })
} catch (error) { report.push({ symbol: 'IFIX/B3', error: error.message }) }
for (let i = 0; i < statements.length; i++) {
  // Corte também no SQL: proteção adicional mesmo se o provedor devolver datas futuras.
  const statement = statements[i].replace(/insert into public\.(price_history|benchmarks)\(([^)]+)\) values /, (match, table, columns) => {
    const fields = columns.split(',')
    return `insert into public.${table}(${columns}) select ${fields.map(f => f === 'date' ? 'v.day::date' : `v.${f}`).join(',')} from (values `
  }).replace(/ on conflict\((ticker|name),date\)/, (match, key) => `) as v(${key},day,${key === 'ticker' ? 'close' : 'value'},source) where v.day::date between date '${from}' and date '${until}' on conflict(${key},date)`)
  await writeFile(`${directory}/batch-${String(i).padStart(3, '0')}.sql`, statement)
}
await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ batches: statements.length, report }, null, 2))
