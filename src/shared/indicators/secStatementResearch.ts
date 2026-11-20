/** Conservative annual US-GAAP research adapter. Never writes portfolio data.
 * Components must be entity-wide USD facts from the SAME annual accession.
 * Custom tags, IFRS and financial firms stay unsupported. Reconstructed EBITDA
 * and NOPAT require complete components under the explicit local convention.
 */
import { companyResearchMetrics, fiveYearCagr, type AnnualStatement, type CompanyStatement } from './researchCalculations.ts'
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
  const sourceUrl = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${filing.accession.replace(/-/g, '')}/${filing.accession}-index.html`
  function instant(tag: string, end: string): number | null {
    const values = (Array.isArray(record(record(gaap[tag]).units).USD) ? record(record(gaap[tag]).units).USD as unknown[] : [])
      .map(record).filter(r => r.accn === filing.accession && r.filed === filing.filed && r.end === end && r.start === undefined
        && ['10-K', '10-K/A'].includes(String(r.form)) && typeof r.val === 'number' && Number.isFinite(r.val)).map(r => r.val as number)
    return values.length && values.every(v => v === values[0]) ? values[0] : null
  }
  const start = operatingIncome?.start ?? cashFlow?.start ?? revenue?.start ?? ''
  const opening = iso(start) ? new Date(Date.parse(start) - 86400000).toISOString().slice(0, 10) : ''
  // DebtCurrent includes short-term borrowings AND current maturities. Never
  // substitute LongTermDebtCurrent alone or assume an absent short-term tag is 0.
  function capital(end: string) {
    const current = instant('DebtCurrent', end), long = instant('LongTermDebtNoncurrent', end)
    const equity = instant('StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', end)
    const cash = instant('CashAndCashEquivalentsAtCarryingValue', end)
    const leaseCurrent = instant('FinanceLeaseLiabilityCurrent', end), leaseLong = instant('FinanceLeaseLiabilityNoncurrent', end)
    // LongTermDebtNoncurrent excludes finance leases. Until a reviewed lease
    // normalization exists, require explicit zeros instead of omitting debt or
    // double-counting an obligation already included in DebtCurrent.
    const debt = current !== null && current >= 0 && long !== null && long >= 0 && leaseCurrent === 0 && leaseLong === 0 ? finite(current + long) : null
    return { current, long, equity, cash, leaseCurrent, leaseLong, debt, invested: debt !== null && equity !== null && cash !== null && cash >= 0 ? finite(equity + debt - cash) : null }
  }
  const begin = capital(opening), end = capital(filing.end)
  const depreciation = read(['DepreciationDepletionAndAmortization'])
  const tax = read(['IncomeTaxExpenseBenefit'])
  const pretax = read(['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest'])
  const taxRate = same(tax, pretax) && same(tax, operatingIncome) && pretax!.value > 0 && tax!.value >= 0 ? finite(tax!.value / pretax!.value) : null
  const statement: CompanyStatement = {
    start, end: filing.end, currency: 'USD', sourceUrl, consolidated: true, reportingBasis: 'US-GAAP; equity including NCI + total debt - cash equivalents', sector: 'operating',
    debt: end.debt, cash: end.cash,
    ebitda: same(operatingIncome, depreciation) && depreciation!.value >= 0 ? finite(operatingIncome!.value + depreciation!.value) : null,
    ebit: operatingIncome?.value ?? null, revenue: revenue?.value ?? null, taxRate,
    openingInvestedCapital: begin.invested, closingInvestedCapital: end.invested,
    operatingCashFlow: cashFlow?.value ?? null, capexOutflow: capex?.value ?? null,
  }
  const advanced = companyResearchMetrics(statement)
  function history(tag: string | undefined): AnnualStatement[] {
    if (!tag) return []
    const data = record(record(gaap[tag]).units).USD
    if (!Array.isArray(data)) return []
    const periods = new Map<string, Row[]>()
    for (const item of data) {
      const r = record(item)
      if (!iso(r.start) || !iso(r.end) || !iso(r.filed) || r.end > filing.end || r.filed > filing.filed
        || !['10-K', '10-K/A'].includes(String(r.form)) || !/^\d{10}-\d{2}-\d{6}$/.test(String(r.accn))
        || typeof r.val !== 'number' || !Number.isFinite(r.val)) continue
      const days = (Date.parse(r.end) - Date.parse(r.start)) / 86400000
      if (days < 350 || days > 380) continue
      const key = `${r.start}/${r.end}`; periods.set(key, [...(periods.get(key) ?? []), r])
    }
    const selected = [...periods.values()].sort((a, b) => String(b[0].end).localeCompare(String(a[0].end))).slice(0, 6)
    // A revised or conflicting series needs review; latest-value wins would
    // silently combine accounting bases. Retain no computed CAGR in that case.
    if (selected.length !== 6 || selected.some(rows => rows.some(r => r.val !== rows[0].val)) || selected[0][0].end !== filing.end) return []
    return selected.map(rows => {
      const r = rows.sort((a, b) => String(b.filed).localeCompare(String(a.filed)))[0]
      return { start: String(r.start), end: String(r.end), currency: 'USD', consolidated: true, reportingBasis: `US-GAAP/${tag}`,
        sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${String(r.accn).replace(/-/g, '')}/${r.accn}-index.html`,
        fiscalYear: Number(String(r.end).slice(0, 4)), revenue: Number(r.val), earnings: Number(r.val) }
    })
  }
  const revenueHistory = history(revenue?.tag), earningsHistory = history('NetIncomeLoss')
  const metrics = { operatingMargin, freeCashFlow, netDebtEbitda: advanced.netDebtEbitda, roic: advanced.roic,
    revenueCagr: fiveYearCagr(revenueHistory, 'revenue'), earningsCagr: fiveYearCagr(earningsHistory, 'earnings') }
  return {
    ticker, cik, provider: 'sec_companyfacts', currency: 'USD', periodEnd: filing.end,
    filingDate: filing.filed, accession: filing.accession,
    sourceUrl,
    metrics,
    evidence: { revenue, operatingIncome, cashFlow, capex, statement, capital: { begin, end }, depreciation, tax, pretax, revenueHistory, earningsHistory },
    status: Object.values(metrics).every(value => value !== null) ? 'complete' : 'partial',
    unavailable: [...Object.entries(metrics).filter(([, value]) => value === null).map(([metric]) => metric), 'propertyFundMetrics'],
  }
}
