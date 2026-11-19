import { supabase } from '../../../shared/services/supabaseClient'
export interface StatementSnapshot {
  ticker: string; accession: string; cik: string; period_end: string; filing_date: string; collected_at: string
  operating_margin: number | null; free_cash_flow: number | null; net_debt_ebitda: number | null; roic: number | null
  revenue_cagr: number | null; earnings_cagr: number | null
}
export async function latestStatement(ticker: string): Promise<StatementSnapshot | null> {
  const { data, error } = await supabase.from('sec_statement_snapshots')
    .select('ticker,accession,cik,period_end,filing_date,collected_at,operating_margin,free_cash_flow,net_debt_ebitda,roic,revenue_cagr,earnings_cagr')
    .eq('ticker', ticker).order('period_end', { ascending: false }).order('filing_date', { ascending: false }).order('accession', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data as StatementSnapshot | null
}
