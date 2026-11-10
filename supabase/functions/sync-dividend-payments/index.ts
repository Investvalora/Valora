import { authorizeServiceJob } from '../_shared/serviceAuthorization.ts'
import { boundedBytes } from '../_shared/officialFiles.ts'
import { fnetDocumentIds, fnetPayment, mastercardPayments } from './parsers.ts'

const url = Deno.env.get('SUPABASE_URL') ?? '', key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error('payment_storage_failed')
  return response
}
async function publicText(source: string) {
  const response = await fetch(source, { redirect: 'error', signal: AbortSignal.timeout(12000) })
  return new TextDecoder().decode(await boundedBytes(response, 2 * 1024 * 1024))
}
interface Task { ticker: string; provider: 'fnet' | 'mastercard'; cnpj: string | null; isin: string | null }
async function payments(task: Task) {
  if (task.provider === 'mastercard') return mastercardPayments(await publicText('https://investor.mastercard.com/stock-information/dividend-history/default.aspx')).filter(e => e.record_date >= new Date(Date.now() - 2 * 366 * 86400000).toISOString().slice(0, 10))
  if (!task.cnpj || !task.isin || !/^\d{14}$/.test(task.cnpj)) throw new Error('fnet_identity_missing')
  const cnpj = task.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10).split('-').reverse().join('/')
  const ids = new Set<number>()
  for (let offset = 0; ; offset += 100) {
    if (offset >= 500) throw new Error('fnet_listing_budget_exceeded')
    const params = new URLSearchParams({ d: '1', s: String(offset), l: '100', cnpj, cnpjFundo: cnpj, dataInicial: since, isSession: 'false', 'o[0][dataReferencia]': 'desc' })
    const listing = fnetDocumentIds(JSON.parse(await publicText(`https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosDados?${params}`)))
    for (const id of listing.ids) ids.add(id)
    if (offset + 100 >= listing.total) break
  }
  if (ids.size > 6) throw new Error('fnet_document_budget_exceeded')
  const events = []
  for (const id of ids) {
    const source = `https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=${id}`
    events.push(fnetPayment(await publicText(source), { ticker: task.ticker, cnpj: task.cnpj, isin: task.isin }, source))
  }
  return events
}

Deno.serve(async request => {
  if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  if (!await authorizeServiceJob(request, url, key)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const errors: string[] = []; let processed = 0, enriched = 0, conflicts = 0
  try {
    const tasks = await (await rest('rpc/claim_dividend_payment_sources', { method: 'POST', body: '{}' })).json() as Task[]
    for (const task of tasks) {
      let ok = false
      try {
        const events = await payments(task)
        const result = await (await rest('rpc/store_confirmed_dividend_payments', { method: 'POST', body: JSON.stringify({ p_ticker: task.ticker, p_events: events }) })).json()
        enriched += result.enriched; conflicts += result.conflicts
        if (result.conflicts) throw new Error('payment_event_conflict')
        processed++; ok = true
      } catch { errors.push(task.ticker) }
      await rest(`dividend_payment_sources?ticker=eq.${encodeURIComponent(task.ticker)}`, { method: 'PATCH', body: JSON.stringify({
        next_sync_at: new Date(Date.now() + (ok ? 8 * 3600000 : 3600000)).toISOString(),
        last_error: ok ? null : 'source_or_event_conflict', ...(ok ? { last_success_at: new Date().toISOString() } : {}),
      }) })
    }
    return Response.json({ processed, enriched, conflicts, failed: errors.length, errors, received_income_created: 0 }, { status: errors.length ? 503 : 200 })
  } catch { return Response.json({ processed, enriched, error: 'payment_sync_incomplete' }, { status: 503 }) }
})
