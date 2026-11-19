import { expect, it } from 'vitest'
import { companyResearchMetrics, fiveYearCagr, propertyFundResearchMetrics, type AnnualStatement, type CompanyStatement, type PropertyFundDisclosure } from './researchCalculations'
const company: CompanyStatement = { start: '2025-01-01', end: '2025-12-31', currency: 'BRL', sourceUrl: 'https://example.com/report', consolidated: true, reportingBasis: 'IFRS', sector: 'operating', debt: 100, cash: 150, ebitda: 25, ebit: 20, revenue: 100, taxRate: 0.25, openingInvestedCapital: 100, closingInvestedCapital: 200, operatingCashFlow: 30, capexOutflow: 40 }
it('keeps net cash and negative free cash flow, uses average invested capital', () => {
  expect(companyResearchMetrics(company)).toEqual({ netDebtEbitda: -2, roic: 10, operatingMargin: 20, freeCashFlow: -10 })
  expect(companyResearchMetrics({ ...company, ebitda: 0 }).netDebtEbitda).toBeNull()
  expect(companyResearchMetrics({ ...company, openingInvestedCapital: 0 }).roic).toBeNull()
  expect(companyResearchMetrics({ ...company, capexOutflow: -40 }).freeCashFlow).toBeNull()
  expect(companyResearchMetrics({ ...company, revenue: 0 }).operatingMargin).toBeNull()
})
it('rejects financial sectors, missing sources, invalid dates and tax assumptions', () => {
  for (const row of [{ ...company, sector: 'financial' as const }, { ...company, sourceUrl: '' }, { ...company, end: '2025-02-31' }]) {
    expect(Object.values(companyResearchMetrics(row)).every(value => value === null)).toBe(true)
  }
  expect(companyResearchMetrics({ ...company, taxRate: 2 }).roic).toBeNull()
})
const annual: AnnualStatement[] = Array.from({ length: 6 }, (_, i) => ({ ...company, fiscalYear: 2020 + i, start: `${2020 + i}-01-01`, end: `${2020 + i}-12-31`, revenue: 100 * 1.1 ** i, earnings: 10 * 1.2 ** i }))
it('requires six comparable years, not five observations or mixed currencies', () => {
  expect(fiveYearCagr(annual, 'revenue')).toBeCloseTo(10)
  expect(fiveYearCagr([...annual].reverse(), 'earnings')).toBeCloseTo(20)
  expect(fiveYearCagr(annual.slice(1), 'revenue')).toBeNull()
  expect(fiveYearCagr(annual.map((row, i) => i === 2 ? { ...row, currency: 'USD' } : row), 'revenue')).toBeNull()
  expect(fiveYearCagr(annual.map((row, i) => i === 0 ? { ...row, earnings: -1 } : row), 'earnings')).toBeNull()
  expect(fiveYearCagr(annual.map((row, i) => i === 2 ? { ...row, fiscalYear: 2021 } : row), 'revenue')).toBeNull()
})
const fund: PropertyFundDisclosure = { referenceDate: '2026-10-31', sourceUrl: 'https://example.com/fund', kind: 'property', vacantArea: 10, leasableArea: 100, vacantPotentialRent: 5, totalPotentialRent: 100, properties: [{ id: 'A', value: 60 }, { id: 'B', value: 40 }], propertyCoverageComplete: true, tenants: [{ id: 'T1', annualRent: 25 }, { id: 'T1', annualRent: 35 }, { id: 'T2', annualRent: 40 }], tenantCoverageComplete: true, contracts: [{ id: 'C1', annualRent: 60, remainingYears: 5 }, { id: 'C2', annualRent: 40, remainingYears: 10 }], contractCoverageComplete: true }
it('distinguishes vacancy bases, groups tenants and weights WAULT by annual rent', () => {
  expect(propertyFundResearchMetrics(fund)).toEqual({ physicalVacancy: 10, financialVacancy: 5, propertyConcentration: 60, tenantConcentration: 60, wault: 7 })
  expect(propertyFundResearchMetrics({ ...fund, contractCoverageComplete: false }).wault).toBeNull()
  expect(propertyFundResearchMetrics({ ...fund, tenantCoverageComplete: false }).tenantConcentration).toBeNull()
  expect(propertyFundResearchMetrics({ ...fund, vacantArea: 101 }).physicalVacancy).toBeNull()
  expect(propertyFundResearchMetrics({ ...fund, kind: 'credit' }).wault).toBeNull()
  expect(propertyFundResearchMetrics({ ...fund, contracts: [fund.contracts[0], fund.contracts[0]] }).wault).toBeNull()
})
