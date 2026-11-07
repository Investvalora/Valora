import { useQuery } from '@tanstack/react-query'
import { historicalRatesService } from '../../dashboard/services/historicalRatesService'
import { shiftIsoDate } from '../../../shared/utils/isoDate'
import type { DividendRow } from '../types'
import type { DatedRate } from '../../dashboard/historicalValuation'

const EMPTY_RATES: DatedRate[] = []

export function useDividendCurrency(rows: DividendRow[], targets?: Map<string, string>, alsoBrl = false) {
  const dates = rows.filter(row => {
    const currency = row.currency ?? (row.source === 'imported' ? 'BRL' : null)
    return currency !== (targets?.get(row.ticker) ?? 'BRL') || (alsoBrl && currency !== 'BRL')
  })
    .flatMap(row => row.payment_date ? [row.payment_date] : []).sort()
  const from = dates[0] ? shiftIsoDate(-10, new Date(`${dates[0]}T12:00:00Z`)) : ''
  const to = dates[dates.length - 1] ?? ''
  const query = useQuery({
    queryKey: ['dividends', 'historical-fx', from, to],
    queryFn: () => historicalRatesService.usd(from, to),
    enabled: Boolean(from && to), staleTime: 3600_000,
  })
  return { rates: query.data ?? EMPTY_RATES, isLoading: Boolean(from) && query.isLoading, isError: Boolean(from) && query.isError,
    refetch: () => from && to ? query.refetch() : Promise.resolve() }
}
