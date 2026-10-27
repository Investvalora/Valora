import { supabase } from '../../../shared/services/supabaseClient'
import type { DividendRow } from '../types'
import { toIsoDate } from '../../../shared/utils/isoDate'

export interface IncomeCoverage { covered_from: string; covered_until: string }
export interface RecordedIncome {
  id: string; ticker: string; type: string; record_date: string | null
  payment_date: string; quantity: number; value_per_share: number
  gross_amount: number; net_amount: number; currency: 'BRL'
  asset: { type: DividendRow['asset_type'] } | null
}
export interface IncomeHistory { entries: RecordedIncome[]; coverage: IncomeCoverage[] }

export const incomeHistoryService = {
  async list(userId: string, walletId: string): Promise<IncomeHistory> {
    const { data: coverage, error } = await supabase.from('wallet_income_imports')
      .select('covered_from, covered_until').eq('user_id', userId).eq('wallet_id', walletId)
    if (error) throw error
    const entries: RecordedIncome[] = []
    for (let start = 0; ; start += 500) {
      const { data, error: pageError } = await supabase.from('wallet_income')
        .select('id, ticker, type, record_date, payment_date, quantity, value_per_share, gross_amount, net_amount, currency, asset:assets(type)')
        .eq('user_id', userId).eq('wallet_id', walletId)
        .order('payment_date').order('id').range(start, start + 499)
      if (pageError) throw pageError
      const page = (data ?? []) as unknown as RecordedIncome[]
      entries.push(...page)
      if (page.length < 500) break
    }
    return { entries, coverage: coverage ?? [] }
  },
}

/** Imported totals are authoritative, including sold assets and withholding. */
export function mergeIncomeHistory(estimates: DividendRow[], history: IncomeHistory, since: string, today = toIsoDate(new Date())): DividendRow[] {
  const uncovered = estimates.filter(row => !row.payment_date || !history.coverage.some(
    period => row.payment_date! >= period.covered_from && row.payment_date! <= period.covered_until,
  ))
  const recorded = history.entries.filter(row => row.payment_date >= since && row.payment_date <= today)
    .map(row => ({
      ticker: row.ticker, type: row.type, ex_date: row.record_date ?? row.payment_date,
      record_date: row.record_date, payment_date: row.payment_date,
      value_per_share: Number(row.value_per_share), quantity: Number(row.quantity),
      total_value: Number(row.net_amount), gross_amount: Number(row.gross_amount),
      asset_type: row.asset?.type ?? null, currency: row.currency, source: 'imported' as const,
    }))
  return [...uncovered, ...recorded].sort((a, b) => (b.payment_date ?? '').localeCompare(a.payment_date ?? ''))
}
