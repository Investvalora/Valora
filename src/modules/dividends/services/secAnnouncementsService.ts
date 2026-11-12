import { supabase } from '../../../shared/services/supabaseClient'

export interface SecAnnouncement {
  ticker: string
  accession: string
  declaration_date: string
  record_date: string
  payment_date: string
  value_per_share: number
  distribution: 'regular' | 'special'
  source_url: string
  confirmed_ex_date?: string | null
}

/** Discovery only: never calculate entitlement, net income or a presumed ex-date. */
export async function listPendingSecAnnouncements(tickers: string[], today: string, until: string): Promise<SecAnnouncement[]> {
  if (!tickers.length) return []
  const { data, error } = await supabase.from('sec_dividend_announcements')
    .select('ticker,accession,declaration_date,record_date,payment_date,value_per_share,distribution,source_url,confirmed_ex_date')
    .in('ticker', tickers).eq('ex_status', 'unconfirmed').gte('payment_date', today).lte('payment_date', until)
    .order('payment_date').order('ticker').order('accession').limit(501)
  if (error) throw error
  if ((data?.length ?? 0) > 500) throw new Error('Muitos anúncios; reduza o período.')
  if (!data?.length) return []
  const confirmed = await supabase.from('dividends').select('ticker,record_date,payment_date,value_per_share,ex_date')
    .in('ticker', tickers).not('source', 'in', '(seed,synthetic)').not('ex_date', 'is', null)
    .gte('payment_date', today).lte('payment_date', until).order('ticker').order('ex_date').limit(501)
  if (confirmed.error) throw confirmed.error
  if ((confirmed.data?.length ?? 0) > 500) throw new Error('Muitos anúncios; reduza o período.')
  return (data as SecAnnouncement[]).filter(row => !(row.distribution === 'special' && row.confirmed_ex_date) && !confirmed.data?.some(event =>
    event.ticker === row.ticker && event.record_date === row.record_date && event.payment_date === row.payment_date
    && Number(event.value_per_share) === Number(row.value_per_share)))
}
