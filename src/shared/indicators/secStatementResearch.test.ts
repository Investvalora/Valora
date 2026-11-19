import { describe, expect, it } from 'vitest'
import { secStatementResearch } from './secStatementResearch'

const accession = '0000320193-26-000001'
function fixtures() {
  const row = { accn: accession, form: '10-K', filed: '2026-02-01', start: '2025-01-01', end: '2025-12-31', val: 0 }
  const sub = { cik: '320193', tickers: ['AAPL'], sic: '3571', filings: { recent: {
    form: ['10-K'], filingDate: ['2026-02-01'], reportDate: ['2025-12-31'], accessionNumber: [accession],
  } } }
  const gaap = {
    Revenues: { units: { USD: [{ ...row, val: 100 }] } },
    OperatingIncomeLoss: { units: { USD: [{ ...row, val: -10 }] } },
    NetCashProvidedByUsedInOperatingActivities: { units: { USD: [{ ...row, val: 20 }] } },
    PaymentsToAcquirePropertyPlantAndEquipment: { units: { USD: [{ ...row, val: 30 }] } },
  }
  return { sub, facts: { cik: 320193, facts: { 'us-gaap': gaap } }, gaap, row }
}
const parse = (f: ReturnType<typeof fixtures>) => secStatementResearch(f.sub, f.facts, 'AAPL', '0000320193', '2026-11-19')
describe('SEC annual statement research', () => {
  it('preserves losses and negative FCF with filing evidence', () => {
    const result = parse(fixtures())
    expect(result.metrics).toEqual({ operatingMargin: -10, freeCashFlow: -10 })
    expect(result.sourceUrl).toContain('/320193/000032019326000001/')
    expect(result.evidence.revenue?.start).toBe('2025-01-01')
    expect(result.unavailable).toContain('roic')
  })
  it('rejects another issuer and financial sectors', () => {
    const f = fixtures(); f.sub.tickers = ['JPM']
    expect(() => parse(f)).toThrow('identity')
    f.sub.tickers = ['AAPL']; f.sub.sic = '6021'
    expect(() => parse(f)).toThrow('sector')
  })
  it('does not combine periods, currencies or other accessions', () => {
    const f = fixtures()
    f.gaap.Revenues.units.USD[0].start = '2025-02-01'
    f.gaap.PaymentsToAcquirePropertyPlantAndEquipment.units.USD[0].accn = '0000320193-25-000001'
    expect(parse(f).metrics).toEqual({ operatingMargin: null, freeCashFlow: null })
    const g = fixtures()
    Object.assign(g.gaap.Revenues, { units: { EUR: g.gaap.Revenues.units.USD } })
    expect(parse(g).metrics.operatingMargin).toBeNull()
  })
  it('rejects conflicting contexts instead of picking an amount', () => {
    const f = fixtures()
    f.gaap.Revenues.units.USD.push({ ...f.row, val: 150 })
    expect(parse(f).metrics.operatingMargin).toBeNull()
  })
  it('does not use quarterly facts, future filings or negative CAPEX outflows', () => {
    const f = fixtures()
    f.gaap.Revenues.units.USD[0].start = '2025-10-01'
    f.gaap.PaymentsToAcquirePropertyPlantAndEquipment.units.USD[0].val = -30
    expect(parse(f).metrics).toEqual({ operatingMargin: null, freeCashFlow: null })
    expect(() => secStatementResearch(f.sub, f.facts, 'AAPL', '0000320193', '2026-01-01')).toThrow('annual_unavailable')
  })
  it('does not silently fall back to an older filing after an amendment', () => {
    const f = fixtures()
    f.sub.filings.recent.form.push('10-K/A')
    f.sub.filings.recent.filingDate.push('2026-03-01')
    f.sub.filings.recent.reportDate.push('2025-12-31')
    f.sub.filings.recent.accessionNumber.push('0000320193-26-000002')
    expect(parse(f).metrics).toEqual({ operatingMargin: null, freeCashFlow: null })
    expect(parse(f).accession).toBe('0000320193-26-000002')
  })
})
