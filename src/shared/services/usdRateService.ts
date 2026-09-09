import { shiftIsoDate, toIsoDate } from '../utils/isoDate'

/**
 * Cotação USD/BRL com a cadeia de fallback de AD-12:
 * BCB PTAX → AwesomeAPI → última taxa em localStorage → R$ 5,00.
 *
 * `getUSDRate` nunca rejeita. Não existe estado de erro para o consumidor:
 * cada elo da cadeia responde ou é ignorado, e o último é uma constante. O que
 * o chamador precisa saber é *de onde* veio o número — daí `source` e
 * `isFallback`, que é o que acende o badge "taxa USD aproximada".
 */

/** De qual elo da cadeia a taxa veio. */
export type USDRateSource = 'bcb' | 'awesomeapi' | 'cache' | 'default'

export interface USDRate {
  /** Quantos reais valem um dólar. */
  rate: number
  source: USDRateSource
  /** `true` quando a taxa não veio de uma fonte viva nesta consulta. */
  isFallback: boolean
  /** Dia da cotação em `YYYY-MM-DD`, quando a fonte informa. */
  date: string | null
}

/**
 * Piso da cadeia. Validado contra o PTAX de 2026-09-03 (5,1253), com
 * cross-check independente via CoinGecko (5,092).
 */
export const USD_RATE_DEFAULT = 5

export const USD_RATE_STORAGE_KEY = 'valora:usd-rate'

/**
 * Janela consultada no PTAX. O BCB publica só em dia útil: pedir apenas "hoje"
 * devolve série vazia em todo fim de semana e feriado, o que derrubaria a
 * fonte oficial para a secundária sem necessidade. Dez dias cobrem qualquer
 * emenda de feriado brasileira.
 */
const PTAX_WINDOW_DAYS = 10

const REQUEST_TIMEOUT_MS = 8_000

const PTAX_ENDPOINT =
  'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)'

const AWESOME_API_ENDPOINT = 'https://economia.awesomeapi.com.br/last/USD-BRL'

/** O Olinda espera as datas em `MM-DD-YYYY`, não em ISO. */
function toPtaxDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${month}-${day}-${year}`
}

function buildPtaxUrl(startIso: string, endIso: string): string {
  const params = new URLSearchParams({
    '@dataInicial': `'${toPtaxDate(startIso)}'`,
    '@dataFinalCotacao': `'${toPtaxDate(endIso)}'`,
    $top: '100',
    $format: 'json',
    $select: 'cotacaoVenda,dataHoraCotacao',
  })

  return `${PTAX_ENDPOINT}?${params.toString()}`
}

/**
 * `fetch` com teto de tempo. Sem o abort, uma fonte que aceita a conexão e não
 * responde deixa a cadeia inteira pendurada e a carteira sem valor de mercado
 * por tempo indeterminado — pior que cair para o fallback.
 */
async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

/** Número utilizável como taxa: finito e positivo. Aceita string do JSON. */
function toRate(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value.trim()) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) return null

  return parsed
}

interface PtaxEntry {
  cotacaoVenda?: unknown
  dataHoraCotacao?: unknown
}

/**
 * Última cotação da série do PTAX.
 *
 * A série vem em ordem crescente de data, mas a escolha é feita pelo máximo de
 * `dataHoraCotacao` em vez de "último item": depender da ordem do provedor
 * transformaria uma mudança de ordenação dele em taxa antiga silenciosa.
 */
function parsePtax(payload: unknown): USDRate | null {
  const entries = (payload as { value?: unknown })?.value
  if (!Array.isArray(entries)) return null

  let best: { rate: number; stamp: string } | null = null

  for (const entry of entries as PtaxEntry[]) {
    const rate = toRate(entry?.cotacaoVenda)
    const stamp = typeof entry?.dataHoraCotacao === 'string' ? entry.dataHoraCotacao : ''
    if (rate === null) continue

    if (!best || stamp > best.stamp) best = { rate, stamp }
  }

  if (!best) return null

  return {
    rate: best.rate,
    source: 'bcb',
    isFallback: false,
    // `dataHoraCotacao` é `YYYY-MM-DD HH:mm:ss.SSS`; o dia são os 10 primeiros.
    date: best.stamp.slice(0, 10) || null,
  }
}

function parseAwesomeApi(payload: unknown): USDRate | null {
  const quote = (payload as { USDBRL?: { bid?: unknown; create_date?: unknown } })?.USDBRL
  const rate = toRate(quote?.bid)
  if (rate === null) return null

  const createdAt = typeof quote?.create_date === 'string' ? quote.create_date : ''

  return { rate, source: 'awesomeapi', isFallback: false, date: createdAt.slice(0, 10) || null }
}

/**
 * localStorage pode lançar (modo privativo, storage desabilitado por política)
 * e o conteúdo é dado externo — as duas leituras são defensivas.
 */
function readCachedRate(): USDRate | null {
  try {
    const raw = window.localStorage.getItem(USD_RATE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { rate?: unknown; date?: unknown }
    const rate = toRate(parsed?.rate)
    if (rate === null) return null

    return {
      rate,
      source: 'cache',
      isFallback: true,
      date: typeof parsed?.date === 'string' ? parsed.date : null,
    }
  } catch {
    return null
  }
}

function saveRate(quote: USDRate): void {
  try {
    window.localStorage.setItem(
      USD_RATE_STORAGE_KEY,
      JSON.stringify({ rate: quote.rate, date: quote.date, source: quote.source }),
    )
  } catch {
    // Sem cache local a cadeia continua funcionando; só perde o penúltimo elo.
  }
}

/** Cada elo devolve `null` em vez de propagar: falha de fonte não é erro aqui. */
async function fetchFromBcb(reference: Date): Promise<USDRate | null> {
  try {
    const url = buildPtaxUrl(shiftIsoDate(-PTAX_WINDOW_DAYS, reference), toIsoDate(reference))
    return parsePtax(await fetchJson(url))
  } catch {
    return null
  }
}

async function fetchFromAwesomeApi(): Promise<USDRate | null> {
  try {
    return parseAwesomeApi(await fetchJson(AWESOME_API_ENDPOINT))
  } catch {
    return null
  }
}

export const usdRateService = {
  /**
   * Percorre a cadeia até alguém responder. A AwesomeAPI é secundária de
   * propósito: devolveu `HTTP 429 QuotaExceeded` em 2026-09-08, e o PTAX não
   * tem chave nem quota.
   */
  async getUSDRate(reference: Date = new Date()): Promise<USDRate> {
    const live = (await fetchFromBcb(reference)) ?? (await fetchFromAwesomeApi())

    if (live) {
      saveRate(live)
      return live
    }

    return (
      readCachedRate() ?? { rate: USD_RATE_DEFAULT, source: 'default', isFallback: true, date: null }
    )
  },
}
