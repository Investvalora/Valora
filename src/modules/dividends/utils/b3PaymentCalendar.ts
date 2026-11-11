import type { DividendRaw } from '../types'

export interface B3Payment {
  ticker: string; type: string; record_date: string; payment_date: string; value_per_share: number
}

/** Expand confirmed installments only when a unique real ex-date is known.
 * Never invent an ex-date or collapse a yearly announcement into one payment. */
export function b3PaymentCalendar(rows: DividendRaw[], anchors: DividendRaw[], payments: B3Payment[],
  status: 'paid' | 'announced', since: string, today: string, until = '9999-12-31'): DividendRaw[] {
  const groups = new Map<string, B3Payment[]>()
  for (const payment of payments) {
    const key = `${payment.ticker}:${payment.type}:${payment.record_date}`
    groups.set(key, [...(groups.get(key) ?? []), payment])
  }
  let result = [...rows]
  for (const group of groups.values()) {
    const first = group[0]
    const lastEx = new Date(Date.parse(`${first.record_date}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10)
    const dates = [...new Set(anchors.filter(row => row.ticker === first.ticker && row.type === first.type && row.ex_date > first.record_date && row.ex_date <= lastEx).map(row => row.ex_date))]
    if (dates.length !== 1) continue
    const ex_date = dates[0]
    // Several approvals paid on the same day form one cash amount for that date.
    const amounts = new Map<string, number>()
    for (const payment of group) amounts.set(payment.payment_date, (amounts.get(payment.payment_date) ?? 0) + Number(payment.value_per_share))
    result = result.filter(row => row.ticker !== first.ticker || row.type !== first.type || row.ex_date !== ex_date)
    for (const [payment_date, value_per_share] of amounts) {
      const included = status === 'paid' ? payment_date >= since && payment_date <= today : payment_date > today && payment_date <= until
      if (included) result.push({ ticker: first.ticker, type: first.type, ex_date, record_date: first.record_date, payment_date, value_per_share, is_installment: amounts.size > 1 })
    }
  }
  return result.sort((a, b) => (b.payment_date ?? '').localeCompare(a.payment_date ?? ''))
}
