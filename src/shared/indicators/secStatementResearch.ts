/** Conservative annual US-GAAP research adapter. Never writes portfolio data.
 * Components must be entity-wide USD facts from the SAME annual accession.
 * Custom tags, IFRS, financial firms and inferred EBITDA/NOPAT stay unsupported.
 */
type Row = Record<string, unknown>
const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const iso = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
interface Fact { start: string; end: string; value: number; tag: string }
export function secStatementResearch(submissions: unknown, companyFacts: unknown, ticker: string, cik: string, asOf: string) {
  const sub = record(submissions), facts = record(companyFacts)
  const normalize = (s: string) => s.replace(/\./g, '-')
  if (!/^\d{10}$/.test(cik) || !iso(asOf) || String(sub.cik).padStart(10, '0') !== cik
    || String(facts.cik).padStart(10, '0') !== cik || !Array.isArray(sub.tickers)
    || !sub.tickers.some(t => typeof t === 'string' && normalize(t) === normalize(ticker))) throw new Error('sec_statement_identity_mismatch')
  const sic = String(sub.sic)
  if (!/^\d{4}$/.test(sic) || Number(sic) >= 6000 && Number(sic) <= 6999) throw new Error('sec_statement_sector_unsupported')
  const recent = record(record(sub.filings).recent)
  const forms = Array.isArray(recent.form) ? recent.form : []
  const annual = forms.flatMap((form, i) => {
    const at = (field: string) => Array.isArray(recent[field]) ? recent[field][i] : undefined
    const filed = at('filingDate'), end = at('reportDate'), accession = at('accessionNumber')
    return ['10-K', '10-K/A'].includes(String(form)) && iso(filed) && iso(end) && end <= filed && filed <= asOf
      && typeof accession === 'string' && /^\d{10}-\d{2}-\d{6}$/.test(accession)
      ? [{ filed, end, accession }] : []
  }).sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed) || b.accession.localeCompare(a.accession))
  const filing = annual[0]
  if (!filing) throw new Error('sec_statement_annual_unavailable')
  const gaap = record(record(facts.facts)['us-gaap'])
  function read(tags: string[]): Fact | null {
    const candidates: Fact[] = []
    for (const tag of tags) {
      const units = record(record(gaap[tag]).units)
      for (const item of Array.isArray(units.USD) ? units.USD : []) {
        const row = record(item)
        if (row.accn !== filing.accession || !['10-K', '10-K/A'].includes(String(row.form)) || row.end !== filing.end
          || !iso(row.start) || !iso(row.end) || !iso(row.filed) || row.filed !== filing.filed
          || typeof row.val !== 'number' || !Number.isFinite(row.val)) continue
        const days = (Date.parse(row.end) - Date.parse(row.start)) / 86400000
        if (days < 350 || days > 380) continue
        candidates.push({ start: row.start, end: row.end, value: row.val, tag })
      }
    }
    const first = candidates[0]
    // Conflicting aliases or contexts are a diagnostic, never an arbitrary pick.
    return first && candidates.every(c => c.start === first.start && c.value === first.value) ? first : null
  }
  const revenue = read(['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'])
  const operatingIncome = read(['OperatingIncomeLoss'])
  const cashFlow = read(['NetCashProvidedByUsedInOperatingActivities'])
  const capex = read(['PaymentsToAcquirePropertyPlantAndEquipment'])
  const same = (a: Fact | null, b: Fact | null) => a !== null && b !== null && a.start === b.start && a.end === b.end
  const finite = (value: number) => Number.isFinite(value) ? value : null
  const operatingMargin = same(revenue, operatingIncome) && revenue!.value > 0
    ? finite(operatingIncome!.value / revenue!.value * 100) : null
  const freeCashFlow = same(cashFlow, capex) && capex!.value >= 0 ? finite(cashFlow!.value - capex!.value) : null
  return {
    ticker, cik, provider: 'sec_companyfacts', currency: 'USD', periodEnd: filing.end,
    filingDate: filing.filed, accession: filing.accession,
    sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${filing.accession.replace(/-/g, '')}/${filing.accession}-index.html`,
    metrics: { operatingMargin, freeCashFlow },
    evidence: { revenue, operatingIncome, cashFlow, capex },
    status: operatingMargin !== null && freeCashFlow !== null ? 'complete_for_two_metrics' : 'partial',
    unavailable: ['netDebtEbitda', 'roic', 'revenueCagr', 'earningsCagr', 'propertyFundMetrics'],
  }
}
