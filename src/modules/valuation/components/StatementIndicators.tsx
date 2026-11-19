import { useState } from 'react'
import { companyResearchMetrics, fiveYearCagr, propertyFundResearchMetrics, type AnnualStatement, type CompanyStatement, type PropertyFundDisclosure } from '../../../shared/indicators/researchCalculations'

const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-[#262626] px-3 text-sm text-white'
const labels = {
  netDebtEbitda: 'Dívida líquida/EBITDA (vezes)', roic: 'ROIC (%)', operatingMargin: 'Margem operacional/EBIT (%)', freeCashFlow: 'Fluxo de caixa livre (moeda informada)',
  revenueCagr: 'CAGR de receitas — 5 anos (%)', earningsCagr: 'CAGR de lucros — 5 anos (%)', physicalVacancy: 'Vacância física (%)', financialVacancy: 'Vacância financeira (%)',
  propertyConcentration: 'Maior concentração por imóvel (%)', tenantConcentration: 'Maior concentração por locatário (%)', wault: 'WAULT ponderado por aluguel (anos)',
} as const
type Result = Partial<Record<keyof typeof labels, number | null>>

/** Manual research, deliberately isolated from catalog data, scores and alerts. */
export function StatementIndicators() {
  const [mode, setMode] = useState('company')
  const [values, setValues] = useState<Record<string, string>>({ currency: 'BRL', sector: 'unknown', kind: 'property' })
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const change = (key: string, value: string) => { setValues(old => ({ ...old, [key]: value })); setResult(null); setError('') }
  const numeric = (key: string) => values[key]?.trim() ? Number(values[key]) : null
  const field = (key: string, label: string, type = 'number') => <label key={key} className="block text-xs text-white/65">{label}<input type={type} step="any" className={inputClass} value={values[key] ?? ''} onChange={e => change(key, e.target.value)} /></label>
  const list = (key: string, label: string, example: string) => <label className="block text-xs text-white/65">{label}<textarea rows={4} className={`${inputClass} py-2`} value={values[key] ?? ''} placeholder={example} onChange={e => change(key, e.target.value)} /><span className="mt-1 block">{example}</span></label>
  function rows(key: string, columns: number) {
    return (values[key] ?? '').split(/\r?\n/).filter(line => line.trim()).map(line => {
      const cells = line.split(';').map(cell => cell.trim())
      if (cells.length !== columns || cells.some(cell => !cell)) throw new Error('Confira as colunas de cada linha. Use ponto decimal e ponto e vírgula entre colunas, sem separador de milhares.')
      return cells
    })
  }
  function listNumber(value: string) {
    if (!/^-?\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw new Error('Use números finitos com ponto decimal, sem separador de milhares nas listas.')
    return Number(value)
  }
  function calculate() {
    setError(''); setResult(null)
    if (!confirmed || !values.sourceUrl?.startsWith('https://')) { setError('Informe a fonte HTTPS e confirme a base dos dados.'); return }
    try {
      const common = { start: values.start ?? '', end: values.end ?? '', currency: values.currency as 'BRL' | 'USD', sourceUrl: values.sourceUrl, consolidated: true as const, reportingBasis: values.reportingBasis ?? '' }
      if (mode === 'company') {
        const row = { ...common, sector: values.sector, debt: numeric('debt'), cash: numeric('cash'), ebitda: numeric('ebitda'), ebit: numeric('ebit'), revenue: numeric('revenue'), taxRate: numeric('taxRate') === null ? null : numeric('taxRate')! / 100,
          openingInvestedCapital: numeric('openingInvestedCapital'), closingInvestedCapital: numeric('closingInvestedCapital'), operatingCashFlow: numeric('operatingCashFlow'), capexOutflow: numeric('capexOutflow') } as CompanyStatement
        setResult(companyResearchMetrics(row))
      } else if (mode === 'growth') {
        const annual = rows('annual', 5).map(([start, end, fiscalYear, revenue, earnings]) => ({ ...common, start, end, fiscalYear: listNumber(fiscalYear), revenue: listNumber(revenue), earnings: listNumber(earnings) })) as AnnualStatement[]
        setResult({ revenueCagr: fiveYearCagr(annual, 'revenue'), earningsCagr: fiveYearCagr(annual, 'earnings') })
      } else {
        const row: PropertyFundDisclosure = { referenceDate: values.referenceDate ?? '', sourceUrl: values.sourceUrl, kind: values.kind as PropertyFundDisclosure['kind'],
          vacantArea: numeric('vacantArea'), leasableArea: numeric('leasableArea'), vacantPotentialRent: numeric('vacantPotentialRent'), totalPotentialRent: numeric('totalPotentialRent'),
          properties: rows('properties', 2).map(([id, value]) => ({ id, value: listNumber(value) })), propertyCoverageComplete: confirmed,
          tenants: rows('tenants', 2).map(([id, rent]) => ({ id, annualRent: listNumber(rent) })), tenantCoverageComplete: confirmed,
          contracts: rows('contracts', 3).map(([id, years, rent]) => ({ id, remainingYears: listNumber(years), annualRent: listNumber(rent) })), contractCoverageComplete: confirmed }
        setResult(propertyFundResearchMetrics(row))
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Confira os dados.') }
  }
  return <details className="mt-5 rounded-2xl border border-white/10 bg-[#1b1b1b] p-5 text-white/75">
    <summary className="cursor-pointer text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue">Indicadores por demonstrativo — pesquisa manual</summary>
    <p className="mt-3 text-xs leading-relaxed">Calcule com dados que você conferiu no relatório do emissor. Esta ferramenta não consulta nem valida o documento do link, não altera fundamentos e não abastece score ou alertas. Não representa cobertura automática dos fornecedores. Campos vazios permanecem indisponíveis.</p>
    <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); calculate() }}>
      <label className="block text-xs">Grupo de indicadores<select className={inputClass} value={mode} onChange={e => { setMode(e.target.value); setResult(null); setConfirmed(false); setError('') }}><option value="company">Empresas: dívida, ROIC, margem e caixa</option><option value="growth">Crescimento em cinco anos</option><option value="fund">FIIs de imóveis: vacância, concentração e contratos</option></select></label>
      {field('sourceUrl', 'Link HTTPS do relatório consultado', 'url')}
      {mode !== 'fund' ? <>
        <div className="grid gap-3 sm:grid-cols-2">{field('reportingBasis', 'Base contábil e escopo comparável (ex.: IFRS consolidado)', 'text')}<label className="text-xs">Moeda comum a todos os valores<select className={inputClass} value={values.currency} onChange={e => change('currency', e.target.value)}><option>BRL</option><option>USD</option></select></label></div>
        {mode === 'company' ? <><label className="block text-xs">Setor<select className={inputClass} value={values.sector} onChange={e => change('sector', e.target.value)}><option value="unknown">Ainda não conferido</option><option value="operating">Empresa operacional não financeira</option><option value="financial">Banco, seguradora ou financeira</option></select></label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{field('start', 'Início do período', 'date')}{field('end', 'Fim do período', 'date')}{field('debt', 'Dívida financeira total')}{field('cash', 'Caixa e equivalentes')}{field('ebitda', 'EBITDA do período')}{field('ebit', 'EBIT do período')}{field('revenue', 'Receita do período')}{field('taxRate', 'Alíquota efetiva validada para NOPAT (%)')}{field('openingInvestedCapital', 'Capital investido no início')}{field('closingInvestedCapital', 'Capital investido no fim')}{field('operatingCashFlow', 'Fluxo de caixa operacional')}{field('capexOutflow', 'CAPEX: saída positiva normalizada')}</div>
          <p className="text-xs leading-relaxed">Dívida e caixa são saldos do fim do período; os fluxos devem cobrir o período informado. ROIC e margens não são anualizados automaticamente. Dívida líquida/EBITDA = (dívida − caixa) ÷ EBITDA positivo. ROIC = EBIT × (1 − alíquota) ÷ capital investido médio × 100. Capital investido deve usar a mesma convenção no início/fim (patrimônio + dívida − caixa não operacional, quando aplicável). Margem = EBIT ÷ receita × 100. FCL aqui é fluxo operacional − CAPEX, não FCFF. Não aplicado automaticamente a financeiras; ausência de convenção validada impede o cálculo confiável.</p>
        </> : <>{list('annual', 'Seis exercícios anuais comparáveis', 'Uma linha por exercício: início;fim;ano fiscal;receita;lucro. Ex.: 2020-01-01;2020-12-31;2020;100;10')}<p className="text-xs">CAGR = (valor final ÷ inicial)^(1/5) − 1. Exige seis exercícios consecutivos, períodos anuais completos, moeda/base iguais e valores positivos; reorganizações e mudanças de exercício exigem revisão. Sem série completa, não há CAGR.</p></>}
      </> : <><div className="grid gap-3 sm:grid-cols-2">{field('referenceDate', 'Referência do relatório', 'date')}<label className="text-xs">Tipo do fundo<select className={inputClass} value={values.kind} onChange={e => change('kind', e.target.value)}><option value="property">Imóveis</option><option value="credit">Papel/recebíveis</option><option value="fund_of_funds">Fundo de fundos</option><option value="mixed">Misto — base não isolada</option></select></label>{field('vacantArea', 'Área vaga (m²)')}{field('leasableArea', 'Área locável total (m²)')}{field('vacantPotentialRent', 'Aluguel potencial perdido por vacância')}{field('totalPotentialRent', 'Aluguel potencial total na mesma base')}</div>
        {list('properties', 'Todos os imóveis e valores na mesma data', 'Uma linha: identificador do imóvel;valor. Ex.: Imóvel A;1000000')}
        {list('tenants', 'Todos os locatários e aluguéis anuais', 'Uma linha: identificador estável do locatário;aluguel anual. Ex.: Locatário A;120000')}
        {list('contracts', 'Todos os contratos e prazos remanescentes', 'Uma linha: contrato único;anos restantes;aluguel anual. Ex.: Contrato A;5;120000')}
        <p className="text-xs leading-relaxed">Vacância física usa área; financeira usa aluguel potencial perdido apenas por vacância, sem misturar inadimplência ou carências. Concentração é a maior exposição: imóvel por valor, locatário por aluguel agregado. WAULT pondera prazo remanescente por aluguel anual; não presume opção de renovação. Exige cobertura completa das listas. Para papel, fundos de fundos ou mistos, são necessárias medidas próprias; estes resultados ficam indisponíveis.</p>
      </>}
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setResult(null) }} />Conferi fonte, período, moeda, unidade e base. As listas utilizadas estão completas; não preenchi dados desconhecidos como zero.</label>
      <button className="min-h-11 rounded-lg border border-white/20 px-4 text-sm" type="submit">Calcular indicadores do relatório</button>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
    {result && <section aria-label="Resultados da pesquisa manual" className="mt-4"><p className="mb-3 text-xs">Resultado calculado sobre entrada manual, sem verificação automática. “Indisponível” indica base ausente, inválida ou incompatível.</p><dl className="grid gap-3 sm:grid-cols-2">{Object.entries(result).map(([key, value]) => <div className="rounded-lg border border-white/10 p-3" key={key}><dt className="text-xs">{labels[key as keyof typeof labels]}</dt><dd className="mt-2 text-sm font-semibold text-white">{value === null ? 'Indisponível' : value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</dd></div>)}</dl></section>}
  </details>
}
