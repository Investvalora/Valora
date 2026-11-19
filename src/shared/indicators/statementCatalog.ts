import { companyResearchMetrics, fiveYearCagr, type AnnualStatement, type CompanyStatement } from './researchCalculations.ts'
export const STATEMENT_METRICS = {
  operatingMargin: { column: 'operating_margin', label: 'Margem operacional', unit: '%' },
  freeCashFlow: { column: 'free_cash_flow', label: 'Fluxo de caixa livre (CFO − imobilizado)', unit: 'USD' },
  netDebtEbitda: { column: 'net_debt_ebitda', label: 'Dívida líquida/EBITDA calculado', unit: 'x' },
  roic: { column: 'roic', label: 'ROIC contábil', unit: '%' },
  revenueCagr: { column: 'revenue_cagr', label: 'CAGR de receitas — 5 anos', unit: '%' },
  earningsCagr: { column: 'earnings_cagr', label: 'CAGR de lucros — 5 anos', unit: '%' },
} as const
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const iso = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
/** Recompute the signed collector's normalized evidence before catalog storage. */
export function validateStatementSnapshot(value: unknown, ticker: string, today: string) {
  const p = record(value), m = record(p.metrics), e = record(p.evidence)
  const invalid = () => { throw new Error('invalid_statement_snapshot') }
  if (p.ticker !== ticker || p.provider !== 'sec_companyfacts' || p.currency !== 'USD' || typeof p.cik !== 'string' || !/^\d{10}$/.test(p.cik)
    || typeof p.accession !== 'string' || !/^\d{10}-\d{2}-\d{6}$/.test(p.accession)
    || !iso(p.periodEnd) || !iso(p.filingDate) || p.periodEnd > p.filingDate || p.filingDate > today) return invalid()
  const expectedUrl = `https://www.sec.gov/Archives/edgar/data/${Number(p.cik)}/${p.accession.replace(/-/g, '')}/${p.accession}-index.html`
  if (p.sourceUrl !== expectedUrl) return invalid()
  for (const [metric, left, right] of [['operatingMargin', 'operatingIncome', 'revenue'], ['freeCashFlow', 'cashFlow', 'capex']] as const) {
    const a = record(e[left]), b = record(e[right]), v = m[metric]
    if (v === null) continue
    if (!finite(v) || !finite(a.value) || !finite(b.value) || !iso(a.start) || a.start !== b.start || a.end !== p.periodEnd || b.end !== p.periodEnd) return invalid()
    const days = (Date.parse(p.periodEnd) - Date.parse(a.start)) / 86400000
    const expected = metric === 'operatingMargin' ? (b.value > 0 ? a.value / b.value * 100 : NaN) : (b.value >= 0 ? a.value - b.value : NaN)
    if (days < 350 || days > 380 || !Number.isFinite(expected) || Math.abs(v - expected) > 1e-8 * Math.max(1, Math.abs(expected))) return invalid()
  }
  const statement = record(e.statement)
  if (statement.sourceUrl !== expectedUrl || statement.currency !== 'USD' || statement.end !== p.periodEnd || statement.sector !== 'operating') return invalid()
  const calculated = companyResearchMetrics(statement as unknown as CompanyStatement)
  for (const metric of ['netDebtEbitda', 'roic'] as const) {
    if (m[metric] !== null && (!finite(m[metric]) || calculated[metric] === null || Math.abs(Number(m[metric]) - calculated[metric]!) > 1e-8)) return invalid()
  }
  for (const [metric, key, field] of [['revenueCagr', 'revenueHistory', 'revenue'], ['earningsCagr', 'earningsHistory', 'earnings']] as const) {
    if (m[metric] === null) continue
    if (!Array.isArray(e[key]) || e[key].length !== 6 || !finite(m[metric])) return invalid()
    const history = e[key] as AnnualStatement[]
    if (history.some(r => typeof r.sourceUrl !== 'string' || !r.sourceUrl.startsWith(`https://www.sec.gov/Archives/edgar/data/${Number(p.cik)}/`))
      || history.map(r => r.end).sort()[5] !== p.periodEnd) return invalid()
    const expected = fiveYearCagr(history, field)
    if (expected === null || Math.abs(Number(m[metric]) - expected) > 1e-8) return invalid()
  }
  for (const metric of Object.keys(STATEMENT_METRICS)) if (m[metric] !== null && !finite(m[metric])) return invalid()
  return p
}
