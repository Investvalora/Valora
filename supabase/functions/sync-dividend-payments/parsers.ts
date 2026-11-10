import { validIso } from '../_shared/officialFiles.ts'

const clean = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-zA-Z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()
const tableRows = (html: string) => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
  [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => clean(cell[1])))
function brDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : ''
  if (!validIso(iso)) throw new Error('payment_invalid_date')
  return iso
}

export interface PaymentEvent { record_date: string; payment_date: string; value_per_share: number; source_url: string }

/** Structured FNET notices, never managerial report prose or estimated dates. */
export function fnetPayment(html: string, identity: { ticker: string; cnpj: string; isin: string }, source_url: string): PaymentEvent {
  if (!/^https:\/\/fnet\.bmfbovespa\.com\.br\/fnet\/publico\/exibirDocumento\?cvm=true&id=\d+$/.test(source_url)) throw new Error('invalid_payment_source')
  const rows = tableRows(html)
  const header = rows.filter(row => row.includes(identity.ticker) && row.includes(identity.isin))
  const fund = rows.find(row => row.some(cell => cell === 'CNPJ do Fundo:'))
  const cnpj = fund?.[fund.indexOf('CNPJ do Fundo:') + 1]?.replace(/\D/g, '')
  if (cnpj !== identity.cnpj || header.length !== 1 || header[0].length !== 6 || header[0][4] !== 'Rendimento') throw new Error('fnet_identity_or_schema_changed')
  const field = (prefix: string) => {
    const matches = rows.filter(row => row[0]?.startsWith(prefix))
    // Amortizations and multiple classes need their own accounting contract.
    if (matches.length !== 1 || matches[0].length !== 3 || matches[0][2]) throw new Error('fnet_unsupported_distribution')
    return matches[0][1]
  }
  const record_date = brDate(field('Data-base'))
  const payment_date = brDate(field('Data do pagamento'))
  const amount = field('Valor do provento')
  if (!/^\d+(,\d+)?$/.test(amount)) throw new Error('payment_invalid_amount')
  const value_per_share = Number(amount.replace(',', '.'))
  if (!Number.isFinite(value_per_share) || value_per_share <= 0 || payment_date < record_date) throw new Error('payment_invalid_event')
  return { record_date, payment_date, value_per_share, source_url }
}

export function fnetDocumentIds(payload: unknown): { ids: number[]; total: number } {
  const data = payload as { data?: Array<{ id: number; status: string; tipoDocumento: string; categoriaDocumento: string }>; recordsFiltered?: number }
  if (!Array.isArray(data?.data) || !Number.isSafeInteger(data.recordsFiltered) || data.recordsFiltered! < 0) throw new Error('fnet_listing_changed')
  const ids = data.data.filter(row => row.status === 'AC' && row.tipoDocumento === 'Rendimentos e Amortizações' && row.categoriaDocumento === 'Aviso aos Cotistas - Estruturado').map(row => row.id)
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('fnet_invalid_document')
  return { ids, total: data.recordsFiltered! }
}

/** Official declared/record/payable table. Record is not silently treated as ex. */
export function mastercardPayments(html: string): PaymentEvent[] {
  const source_url = 'https://investor.mastercard.com/stock-information/dividend-history/default.aspx'
  if (!/<title[^>]*>[^<]*Mastercard[^<]*Dividend History/i.test(html)) throw new Error('mastercard_identity_changed')
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].filter(table => ['Declared', 'Record', 'Payable', 'Amount', 'Type'].every(label => table[1].includes(label)))
  if (tables.length !== 1) throw new Error('mastercard_schema_changed')
  const usDate = (value: string) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value)
    if (!match) throw new Error('payment_invalid_date')
    return brDate(`${match[2]}/${match[1]}/20${match[3]}`)
  }
  const rows = tableRows(tables[0][1]).filter(row => row.length && row[0] !== 'Declared')
  if (!rows.length) throw new Error('mastercard_empty_table')
  return rows.map(row => {
    if (row.length !== 5 || row[4] !== 'Regular Cash' || !/^\$\d+\.\d+$/.test(row[3])) throw new Error('mastercard_distribution_changed')
    const record_date = usDate(row[1]), payment_date = usDate(row[2]), value_per_share = Number(row[3].slice(1))
    if (!Number.isFinite(value_per_share) || value_per_share <= 0 || payment_date < record_date) throw new Error('payment_invalid_event')
    return { record_date, payment_date, value_per_share, source_url }
  })
}
