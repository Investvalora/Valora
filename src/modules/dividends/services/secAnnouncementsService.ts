import { supabase } from '../../../shared/services/supabaseClient'

export interface SecAnnouncement {
  ticker: string
  accession: string
  declaration_date: string | null
  record_date: string
  payment_date: string
  value_per_share: number
  distribution: 'regular' | 'special'
  source_url: string
  confirmed_ex_date?: string | null
  currency?: 'USD' | 'BRL'
  source_kind?: 'sec' | 'fnet'
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
  const notices = await supabase.from('fnet_payment_notices')
    .select('ticker,source_url,record_date,payment_date,value_per_share')
    .in('ticker', tickers).gte('payment_date', today).lte('payment_date', until)
    .order('payment_date').order('ticker').order('source_url').limit(501)
  if (notices.error) throw notices.error
  if ((notices.data?.length ?? 0) > 500) throw new Error('Muitos anúncios; reduza o período.')
  const fnet: SecAnnouncement[] = []
  for (const notice of notices.data ?? []) {
    // Several documents can repeat a payment. Keep evidence in storage; never
    // sum provider rows or hide revised amounts under the same record date.
    if (!fnet.some(row => row.ticker === notice.ticker && row.record_date === notice.record_date
      && row.payment_date === notice.payment_date && Number(row.value_per_share) === Number(notice.value_per_share))) {
      fnet.push({ ...notice, accession: notice.source_url, declaration_date: null,
        distribution: 'regular', currency: 'BRL', source_kind: 'fnet' })
    }
  }
  const pending = [...(data ?? []) as SecAnnouncement[], ...fnet]
  if (!pending.length) return []
  const confirmed = await supabase.from('dividends').select('ticker,record_date,payment_date,value_per_share,ex_date')
    .in('ticker', tickers).eq('type', 'dividend').not('source', 'in', '(seed,synthetic)').not('ex_date', 'is', null)
    .gte('payment_date', today).lte('payment_date', until).order('ticker').order('ex_date').limit(501)
  if (confirmed.error) throw confirmed.error
  if ((confirmed.data?.length ?? 0) > 500) throw new Error('Muitos anúncios; reduza o período.')
  return pending.filter(row => !(row.distribution === 'special' && row.confirmed_ex_date) && !confirmed.data?.some(event =>
    event.ticker === row.ticker && event.record_date === row.record_date && event.payment_date === row.payment_date
    && Number(event.value_per_share) === Number(row.value_per_share)))
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date) || a.ticker.localeCompare(b.ticker))
}
