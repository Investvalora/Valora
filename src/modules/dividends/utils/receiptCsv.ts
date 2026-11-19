export interface ReceiptInput {
  broker: string; reference: string; payment_date: string; record_date: string | null; ticker: string
  type: 'dividend' | 'jcp'; currency: 'BRL' | 'USD'
  gross_amount: string; withholding_amount: string; fees_amount: string; net_amount: string
  quantity: string | null; value_per_share: string | null
}
const required = ['corretora','referencia','data','ticker','tipo','moeda','bruto','imposto','tarifa','liquido']
const optional = ['quantidade','valor_unitario','data_com']
export const RECEIPT_HEADER = [...required, ...optional].join(';')
function cells(line: string) {
  const values: string[] = []; let value = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (quoted && line[i+1] === '"') { value += '"'; i++ } else quoted = !quoted }
    else if (c === ';' && !quoted) { values.push(value.trim()); value = '' } else value += c
  }
  if (quoted) throw Error('Aspas incompletas; cada crédito deve ocupar uma linha.')
  return [...values, value.trim()]
}
function decimal(value: string, scale = 8, integers = 12) {
  if (!new RegExp(`^\\d{1,${integers}}(?:[.,]\\d{1,${scale}})?$`).test(value)) throw Error('Valor inválido: use decimal sem separador de milhares, sinal ou símbolo de moeda.')
  const [whole, fraction = ''] = value.replace(',', '.').split('.')
  const digits = fraction.padEnd(scale, '0')
  return { text: `${BigInt(whole)}.${digits}`, units: BigInt(whole + digits) }
}
function date(value: string, today: string) {
  const iso = value.includes('/') ? value.split('/').reverse().join('-') : value
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(Date.parse(iso)) || new Date(iso).toISOString().slice(0,10) !== iso || iso > today || iso < '1900-01-01') throw Error('Data inválida ou futura.')
  return iso
}
export function parseReceiptCsv(text: string, today: string) {
  const rows: ReceiptInput[] = [], errors: string[] = []
  if (text.length > 300000) return { rows, errors: ['Arquivo acima de 300 KB.'] }
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2 || lines.length > 501) return { rows, errors: ['Use de 1 a 500 créditos por arquivo.'] }
  let headers: string[]
  try { headers = cells(lines[0]).map(v => v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()) } catch (e) { return { rows, errors: [(e as Error).message] } }
  if (new Set(headers).size !== headers.length || required.some(h => !headers.includes(h)) || headers.some(h => ![...required,...optional].includes(h))) return { rows, errors: [`Cabeçalho esperado: ${RECEIPT_HEADER}`] }
  const seen = new Set<string>()
  for (let i = 1; i < lines.length; i++) try {
    const values = cells(lines[i]); if (values.length !== headers.length) throw Error('Número de colunas diferente do cabeçalho.')
    const r = Object.fromEntries(headers.map((h,j) => [h, values[j]]))
    if (!/^[\p{L}\p{N} ._-]{1,60}$/u.test(r.corretora) || !/^[A-Za-z0-9_.:/-]{1,100}$/.test(r.referencia)) throw Error('Informe corretora e referência única do crédito no extrato.')
    const key = `${r.corretora.toLowerCase()}|${r.referencia}`
    if (seen.has(key)) throw Error('Referência repetida no arquivo.')
    if (!/^[A-Z0-9.^-]{1,24}$/.test(r.ticker) || !['dividend','jcp'].includes(r.tipo) || !['BRL','USD'].includes(r.moeda)) throw Error('Ticker, tipo (dividend/jcp) ou moeda (BRL/USD) inválidos.')
    const gross = decimal(r.bruto), tax = decimal(r.imposto), fees = decimal(r.tarifa), net = decimal(r.liquido)
    if (gross.units <= 0n || gross.units - tax.units - fees.units !== net.units) throw Error('Líquido deve ser exatamente bruto − imposto − tarifa.')
    const quantity = r.quantidade ? decimal(r.quantidade, 8, 10) : null
    const unit = r.valor_unitario ? decimal(r.valor_unitario, 10, 14) : null
    if (quantity && quantity.units === 0n) throw Error('Quantidade informada deve ser maior que zero.')
    const paid = date(r.data,today), record = r.data_com ? date(r.data_com,today) : null
    if (record && record > paid) throw Error('Data COM posterior ao crédito.')
    rows.push({ broker: r.corretora.toLowerCase(), reference: r.referencia, payment_date: paid, record_date: record, ticker: r.ticker,
      type: r.tipo as ReceiptInput['type'], currency: r.moeda as ReceiptInput['currency'], gross_amount: gross.text,
      withholding_amount: tax.text, fees_amount: fees.text, net_amount: net.text, quantity: quantity?.text ?? null, value_per_share: unit?.text ?? null })
    seen.add(key)
  } catch (e) { errors.push(`Linha ${i+1}: ${(e as Error).message}`) }
  return { rows, errors }
}
