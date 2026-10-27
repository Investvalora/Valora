import type { DividendRaw } from '../../dividends/types'
import type { YahooDividendsResponse } from '../types'

/** Recalcula o total a partir dos eventos, sem misturar histórico parcial do banco. */
export function marketDividendRows(ticker: string, response: YahooDividendsResponse, since: string, until: string): DividendRaw[] {
  if (response.source !== 'yahoo' || response.ticker !== ticker || !Array.isArray(response.payments)) throw new Error('Histórico de proventos inválido.')
  return response.payments.filter((payment) => /^\d{4}-\d{2}-\d{2}$/.test(payment.date) && payment.date >= since && payment.date <= until && Number.isFinite(payment.amount) && payment.amount > 0)
    .map((payment) => ({ ticker, type: 'dividend', ex_date: payment.date, payment_date: payment.date, value_per_share: payment.amount }))
}
