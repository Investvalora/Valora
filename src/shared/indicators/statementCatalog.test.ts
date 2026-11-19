import { expect, it } from 'vitest'
import { validateStatementSnapshot } from './statementCatalog'
function fixture() {
  const sourceUrl = 'https://www.sec.gov/Archives/edgar/data/320193/000032019326000001/0000320193-26-000001-index.html'
  const period = { start: '2025-01-01', end: '2025-12-31' }
  return { ticker: 'AAPL', cik: '0000320193', accession: '0000320193-26-000001', provider: 'sec_companyfacts', currency: 'USD',
    periodEnd: period.end, filingDate: '2026-02-01', sourceUrl,
    metrics: { operatingMargin: 20, freeCashFlow: -10, netDebtEbitda: null, roic: null, revenueCagr: null, earningsCagr: null },
    evidence: { revenue: { ...period, value: 100 }, operatingIncome: { ...period, value: 20 }, cashFlow: { ...period, value: 20 }, capex: { ...period, value: 30 },
      statement: { ...period, sourceUrl, currency: 'USD', consolidated: true, sector: 'operating', reportingBasis: 'US-GAAP' } },
  }
}
it('recomputes annual values and retains unavailable metrics', () => {
  expect(validateStatementSnapshot(fixture(), 'AAPL', '2026-11-19').ticker).toBe('AAPL')
})
it('rejects incorrect numbers, periods, issuer, document and future filing', () => {
  const cases = [
    { ...fixture(), ticker: 'MSFT' }, { ...fixture(), sourceUrl: 'https://example.com/report' },
    { ...fixture(), filingDate: '2027-01-01' }, { ...fixture(), metrics: { ...fixture().metrics, operatingMargin: 21 } },
    { ...fixture(), evidence: { ...fixture().evidence, capex: { start: '2025-02-01', end: '2025-12-31', value: 30 } } },
    { ...fixture(), metrics: { ...fixture().metrics, roic: 999 } },
  ]
  for (const value of cases) expect(() => validateStatementSnapshot(value, 'AAPL', '2026-11-19')).toThrow()
})
