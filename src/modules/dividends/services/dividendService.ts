import { supabase } from '../../../shared/services/supabaseClient'
import { toIsoDate } from '../../../shared/utils/isoDate'
import type { DividendRaw } from '../types'
import { DIVIDENDS_LIMIT } from '../utils/dividendConstants'
import { b3PaymentCalendar, type B3Payment } from '../utils/b3PaymentCalendar'

/** Colunas selecionadas — mantido explícito para evitar over-fetching. */

const DIVIDEND_COLUMNS = 'ticker, type, ex_date, record_date, payment_date, value_per_share'

export const dividendService = {
  /**
   * Sincroniza dividendos reais via Yahoo Finance para os tickers fornecidos
   * (ou para todos os tickers da carteira se nenhum for informado).
   * Os dados são persistidos na tabela `dividends` com source='yahoo',
   * sobrescrevendo os dados sintéticos do seed.
   */
  async syncFromYahoo(tickers?: string[]): Promise<{ synced: number; inserted: number; tickers_processed: string[] }> {
    const { data, error } = await supabase.functions.invoke('sync-dividends-yahoo', {
      body: tickers && tickers.length > 0 ? { tickers } : {},
    })
    if (error) throw error
    return data as { synced: number; inserted: number; tickers_processed: string[] }
  },

  /**
  * Proventos pagos dos tickers fornecidos no intervalo `[since, hoje]`.
   *
   * Filtros aplicados no banco:
   * - `ticker IN tickers` — só proventos da carteira do usuário
  * - `payment_date` dentro do período selecionado; datas ausentes não comprovam pagamento
  * - exclui pagamentos futuros da visão de pagos
   * - `value_per_share > 0` — exclui registros zerados
   *
   * RLS de `dividends` libera SELECT apenas para `authenticated`; sem sessão
   * a resposta viria vazia.
   */
  async listDividendsByTickers(tickers: string[], since: string, completeHistory = false, status: 'paid' | 'announced' = 'paid', until?: string): Promise<DividendRaw[]> {
    if (tickers.length === 0) return []

    const today = toIsoDate(new Date())

    const rows: DividendRaw[] = []
    for (let start = 0; ; start += DIVIDENDS_LIMIT) {
      const query = supabase
        .from('dividends')
        .select(DIVIDEND_COLUMNS)
        .not('source', 'in', '(seed,synthetic)')
        .in('ticker', tickers)
        .or(status === 'announced'
          ? `and(payment_date.gt.${today},payment_date.lte.${until ?? '9999-12-31'}),and(payment_date.is.null,ex_date.lte.${until ?? '9999-12-31'})`
          : `and(payment_date.gte.${since},payment_date.lte.${today})`)
        .gt('value_per_share', 0)
        .order('payment_date', { ascending: false, nullsFirst: false })
        .order('ex_date', { ascending: false })
        .order('ticker')
        .order('type')
      const { data, error } = await (completeHistory ? query.range(start, start + DIVIDENDS_LIMIT - 1) : query.limit(DIVIDENDS_LIMIT))

      if (error) throw error
      const page = (data ?? []) as unknown as DividendRaw[]
      rows.push(...page)
      if (!completeHistory || page.length < DIVIDENDS_LIMIT) break
    }
    // Special dividends have issuer classification plus an independent ex-date.
    // Read them here, never in the recurring fundamentals/DY table.
    const { data: special, error: specialError } = await supabase.from('sec_dividend_announcements')
      .select('ticker,confirmed_ex_date,record_date,payment_date,value_per_share')
      .in('ticker', tickers).eq('distribution', 'special').not('confirmed_ex_date', 'is', null)
      .gte('payment_date', status === 'announced' ? today : since)
      .lte('payment_date', status === 'announced' ? until ?? '9999-12-31' : today)
      .order('payment_date').order('ticker').order('accession').limit(501)
    if (specialError) throw specialError
    if ((special?.length ?? 0) > 500) throw new Error('Muitos anúncios; reduza o período.')
    for (const event of special ?? []) {
      if (status === 'announced' && event.payment_date <= today) continue
      if (!rows.some(row => row.ticker === event.ticker && row.ex_date === event.confirmed_ex_date && row.payment_date === event.payment_date && Number(row.value_per_share) === Number(event.value_per_share))) {
        rows.push({ ticker: event.ticker, type: 'dividend', ex_date: event.confirmed_ex_date, record_date: event.record_date,
          payment_date: event.payment_date, value_per_share: Number(event.value_per_share), is_special: true })
      }
    }
    const payments: B3Payment[] = []
    for (let start = 0; ; start += DIVIDENDS_LIMIT) {
      const { data, error } = await supabase.from('b3_cash_announcements')
        .select('ticker,type,record_date,payment_date,value_per_share,approval_date')
        .in('ticker', tickers).order('ticker').order('record_date').order('payment_date').order('approval_date').order('type').order('value_per_share')
        .range(start, start + DIVIDENDS_LIMIT - 1)
      if (error) throw error
      const page = (data ?? []) as B3Payment[]
      payments.push(...page)
      if (page.length < DIVIDENDS_LIMIT) break
    }
    if (!payments.length) return rows
    const dates = payments.map(row => row.record_date).sort()
    const lastEx = new Date(Date.parse(`${dates[dates.length - 1]}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10)
    const anchors: DividendRaw[] = []
    for (let start = 0; ; start += DIVIDENDS_LIMIT) {
      const { data, error } = await supabase.from('dividends').select(DIVIDEND_COLUMNS)
        .not('source', 'in', '(seed,synthetic)')
        .in('ticker', [...new Set(payments.map(row => row.ticker))])
        .gt('ex_date', dates[0]).lte('ex_date', lastEx)
        .order('ticker').order('ex_date').order('type').range(start, start + DIVIDENDS_LIMIT - 1)
      if (error) throw error
      const page = (data ?? []) as DividendRaw[]
      anchors.push(...page)
      if (page.length < DIVIDENDS_LIMIT) break
    }
    return b3PaymentCalendar(rows, anchors, payments, status, since, today, until)
  },
}
