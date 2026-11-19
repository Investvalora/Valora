/** Calculation contracts for reviewed statements. Not a quote-provider fallback.
 * Callers must supply a complete, comparable disclosure; missing data stays null.
 */
export interface StatementPeriod {
  start: string; end: string; currency: 'BRL' | 'USD'; sourceUrl: string
  consolidated: true; reportingBasis: string
}
export interface CompanyStatement extends StatementPeriod {
  sector: 'operating' | 'financial' | 'unknown'
  debt: number | null; cash: number | null; ebitda: number | null
  ebit: number | null; revenue: number | null; taxRate: number | null
  openingInvestedCapital: number | null; closingInvestedCapital: number | null
  operatingCashFlow: number | null; capexOutflow: number | null
}
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
const positive = (n: unknown): n is number => finite(n) && n > 0
const nonnegative = (n: unknown): n is number => finite(n) && n >= 0
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
function validPeriod(period: StatementPeriod) {
  return period.consolidated === true && !!period.reportingBasis?.trim() && validDate(period.start) && validDate(period.end)
    && period.start < period.end && ['BRL', 'USD'].includes(period.currency) && /^https:\/\//.test(period.sourceUrl)
}
const safe = (value: number): number | null => Number.isFinite(value) ? value : null

export function companyResearchMetrics(row: CompanyStatement) {
  const empty = { netDebtEbitda: null, roic: null, operatingMargin: null, freeCashFlow: null }
  if (!validPeriod(row) || row.sector !== 'operating') return empty
  const capital = positive(row.openingInvestedCapital) && positive(row.closingInvestedCapital)
    ? (row.openingInvestedCapital + row.closingInvestedCapital) / 2 : null
  return {
    netDebtEbitda: nonnegative(row.debt) && nonnegative(row.cash) && positive(row.ebitda) ? safe((row.debt - row.cash) / row.ebitda) : null,
    roic: finite(row.ebit) && nonnegative(row.taxRate) && row.taxRate <= 1 && positive(capital)
      ? safe(row.ebit * (1 - row.taxRate) / capital * 100) : null,
    operatingMargin: finite(row.ebit) && positive(row.revenue) ? safe(row.ebit / row.revenue * 100) : null,
    // CAPEX is an explicitly normalized positive cash outflow, never Math.abs(raw).
    freeCashFlow: finite(row.operatingCashFlow) && nonnegative(row.capexOutflow) ? safe(row.operatingCashFlow - row.capexOutflow) : null,
  }
}

export interface AnnualStatement extends StatementPeriod { fiscalYear: number; revenue: number | null; earnings: number | null }
/** Six comparable annual observations, five full fiscal-year intervals. */
export function fiveYearCagr(input: AnnualStatement[], field: 'revenue' | 'earnings'): number | null {
  if (input.length !== 6 || input.some(row => !validPeriod(row) || !Number.isInteger(row.fiscalYear))) return null
  const rows = [...input].sort((a, b) => a.fiscalYear - b.fiscalYear)
  const first = rows[0], last = rows[5]
  if (rows.some((row, index) => row.fiscalYear !== first.fiscalYear + index || row.currency !== first.currency
    || row.reportingBasis !== first.reportingBasis || !positive(row[field])
    || (index > 0 && (Date.parse(row.start) - Date.parse(rows[index - 1].end)) / 86400000 !== 1)
    || (Date.parse(row.end) - Date.parse(row.start)) / 86400000 < 350
    || (Date.parse(row.end) - Date.parse(row.start)) / 86400000 > 380)) return null
  // This convention rejects short years, duplicate years and nonpositive bases.
  const elapsed = (Date.parse(last.end) - Date.parse(first.end)) / 86400000 / 365.2425
  if (Math.abs(elapsed - 5) > 0.1) return null
  return safe((Math.pow(last[field]! / first[field]!, 1 / 5) - 1) * 100)
}

export interface PropertyFundDisclosure {
  referenceDate: string; sourceUrl: string; kind: 'property' | 'credit' | 'fund_of_funds' | 'mixed'
  vacantArea: number | null; leasableArea: number | null
  vacantPotentialRent: number | null; totalPotentialRent: number | null
  properties: { id: string; value: number }[]; propertyCoverageComplete: boolean
  tenants: { id: string; annualRent: number }[]; tenantCoverageComplete: boolean
  contracts: { id: string; remainingYears: number; annualRent: number }[]; contractCoverageComplete: boolean
}
/** Largest exposure; identifiers are aggregated so multiple leases cannot hide concentration. */
function concentration(rows: { id: string; weight: number }[], complete: boolean) {
  if (!complete || !rows.length || rows.some(row => !row.id.trim() || !nonnegative(row.weight))) return null
  const totals = new Map<string, number>()
  for (const row of rows) totals.set(row.id, (totals.get(row.id) ?? 0) + row.weight)
  const sum = [...totals.values()].reduce((a, b) => a + b, 0)
  return positive(sum) ? safe(Math.max(...totals.values()) / sum * 100) : null
}
export function propertyFundResearchMetrics(row: PropertyFundDisclosure) {
  const empty = { physicalVacancy: null, financialVacancy: null, propertyConcentration: null, tenantConcentration: null, wault: null }
  if (row.kind !== 'property' || !validDate(row.referenceDate) || !/^https:\/\//.test(row.sourceUrl)) return empty
  const ratio = (a: number | null, b: number | null) => nonnegative(a) && positive(b) && a <= b ? safe(a / b * 100) : null
  const contractsValid = row.contractCoverageComplete && row.contracts.length > 0 && row.contracts.every(c => c.id.trim() && nonnegative(c.remainingYears) && nonnegative(c.annualRent))
    && new Set(row.contracts.map(c => c.id)).size === row.contracts.length
  const rent = row.contracts.reduce((sum, c) => sum + c.annualRent, 0)
  return {
    physicalVacancy: ratio(row.vacantArea, row.leasableArea),
    financialVacancy: ratio(row.vacantPotentialRent, row.totalPotentialRent),
    propertyConcentration: concentration(row.properties.map(p => ({ id: p.id, weight: p.value })), row.propertyCoverageComplete && new Set(row.properties.map(p => p.id)).size === row.properties.length),
    tenantConcentration: concentration(row.tenants.map(t => ({ id: t.id, weight: t.annualRent })), row.tenantCoverageComplete),
    wault: contractsValid && positive(rent) ? safe(row.contracts.reduce((sum, c) => sum + c.annualRent * c.remainingYears, 0) / rent) : null,
  }
}
