import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { fmtMoney } from '../../ativos/utils/fmt'
import { fiiCeiling, passiveIncomeGoal, simulateCompound, simulateFii, type SimulationMonth } from '../utils/investmentSimulations'
import type { StrategyInput } from '../hooks/useStrategies'

const modes = { compound: 'Juros compostos', fii: 'Reinvestimento em FIIs', goal: 'Renda passiva', ceiling: 'Preço-teto de FII' } as const
type Mode = keyof typeof modes
type Values = typeof initial
const initial = { initial: 1000, contribution: 200, annual: 12, months: 120, adjustment: 0, price: 10, income: 1300, inflation: 4.39, treasury: 8.3, tax: 15, premium: 1, dividend: 1.2 }
type Result = { metrics: { label: string; value: string }[]; rows?: SimulationMonth[]; requiredYield?: number }
const pct = (value: number) => `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`

export function InvestmentCalculators({ onUseYield }: { onUseYield: (yieldRate: number, parameters?: Partial<StrategyInput>) => void }) {
  const [mode, setMode] = useState<Mode>('compound')
  const [values, setValues] = useState(initial)
  const [reinvest, setReinvest] = useState(true)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  function field(key: keyof Values, label: string, min = 0, max?: number) {
    return <label className="block text-xs text-white/60" key={key}>{label}<input type="number" min={min} max={max} step={key === 'months' ? '1' : 'any'} required value={Number.isFinite(values[key]) ? values[key] : ''} onChange={(event) => { setValues({ ...values, [key]: event.target.valueAsNumber }); setResult(null); setError('') }} className="mt-2 h-11 w-full rounded-lg border border-white/15 bg-[#222222] px-3 text-sm text-white focus:border-[#9299ff] focus:outline-none" /></label>
  }
  function calculate() {
    const v = values
    try {
      let next: Result
      if (mode === 'compound' || mode === 'fii') {
        const rows = mode === 'compound'
          ? simulateCompound(v.initial, v.contribution, v.annual / 100, v.months, v.adjustment / 100)
          : simulateFii(v.initial, v.contribution, v.price, v.annual / 100, v.months, reinvest)
        const last = rows[rows.length - 1]
        next = { rows, metrics: [
          { label: 'Patrimônio ao final', value: fmtMoney(last.balance) },
          { label: 'Total aportado', value: fmtMoney(last.invested) },
          { label: mode === 'compound' ? 'Juros acumulados' : 'Proventos acumulados', value: fmtMoney(last.earnings) },
          ...(mode === 'fii' ? [{ label: 'Cotas ao final', value: last.shares!.toLocaleString('pt-BR') }, { label: 'Renda mensal com as cotas finais', value: fmtMoney(last.shares! * v.price * v.annual / 100 / 12) }, { label: 'Saldo não aplicado', value: fmtMoney(last.cash) }] : []),
        ] }
      } else if (mode === 'goal') {
        const goal = passiveIncomeGoal(v.income, v.annual / 100, v.initial, v.months, v.inflation / 100)
        next = { metrics: [{ label: 'Capital para a renda mensal nominal', value: fmtMoney(goal.target) }, { label: 'Aporte mensal necessário', value: fmtMoney(goal.contribution) }, { label: 'Renda futura em poder de compra atual', value: fmtMoney(goal.realIncome) }] }
      } else {
        const ceiling = fiiCeiling(v.dividend, v.inflation / 100, v.treasury / 100, v.tax / 100, v.premium / 100)
        next = { requiredYield: ceiling.requiredYield, metrics: [{ label: 'Referência bruta anual', value: pct(ceiling.gross) }, { label: 'Referência líquida anual simplificada', value: pct(ceiling.net) }, { label: 'DY mínimo exigido', value: pct(ceiling.requiredYield) }, { label: 'Preço-teto por cota', value: fmtMoney(ceiling.ceiling) }] }
      }
      setResult(next); setError('')
    } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : 'Confira os valores.') }
  }
  return <section aria-label="Calculadoras de investimento" className="rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-5 lg:p-6">
    <h2 className="flex items-center gap-2 text-sm font-medium text-white"><Calculator className="h-4 w-4 text-[#a0a7ff]" />Calculadoras e simulações</h2>
    <p className="mt-1 text-xs leading-relaxed text-white/45">Planeje aportes, reinvestimentos e metas. Os valores são premissas editáveis de um cenário, sem cotações ou taxas oficiais em tempo real.</p>
    <div className="my-5 flex flex-wrap gap-2" role="group" aria-label="Tipo de simulação">{Object.entries(modes).map(([key, label]) => <button key={key} type="button" aria-pressed={mode === key} onClick={() => { setMode(key as Mode); setResult(null); setError('') }} className={`rounded-full border px-3 py-2 text-xs transition-colors ${mode === key ? 'border-[#797fff]/50 bg-[#797fff]/10 text-[#c2c5ff]' : 'border-white/10 text-white/50 hover:bg-white/5'}`}>{label}</button>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); calculate() }}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mode !== 'ceiling' && field('initial', 'Valor inicial (R$)')}
        {(mode === 'compound' || mode === 'fii') && field('contribution', 'Aporte mensal (R$)')}
        {mode !== 'ceiling' && field('months', 'Prazo (meses)', 1, 600)}
        {mode !== 'ceiling' && field('annual', mode === 'fii' ? 'DY anual de distribuição (%)' : 'Rentabilidade anual efetiva (%)', 0, 100)}
        {mode === 'compound' && field('adjustment', 'Reajuste anual do aporte (%)', 0, 100)}
        {mode === 'fii' && field('price', 'Preço constante da cota (R$)', 0.01)}
        {mode === 'goal' && field('income', 'Renda mensal desejada no futuro (R$)', 0.01)}
        {(mode === 'goal' || mode === 'ceiling') && field('inflation', 'Inflação anual estimada (%)', 0, 100)}
        {mode === 'ceiling' && <>{field('dividend', 'Proventos por cota em 12 meses (R$)', 0.01)}{field('treasury', 'Taxa real do Tesouro IPCA+ (% a.a.)', 0, 100)}{field('tax', 'Imposto estimado sobre o rendimento (%)', 0, 99)}{field('premium', 'Prêmio de risco adicional (%)', 0, 100)}</>}
      </div>
      {mode === 'fii' && <label className="mt-4 flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={reinvest} onChange={(event) => { setReinvest(event.target.checked); setResult(null) }} />Reinvestir os proventos em cotas inteiras</label>}
      <p className="mt-4 text-[11px] leading-relaxed text-white/40">{mode === 'compound' ? 'Juros sobre o saldo no início do mês; aporte no fim do mês. Taxa mensal = (1 + taxa anual)^(1/12) − 1. Reajuste do aporte a cada 12 meses. Resultado bruto, sem impostos e taxas.' : mode === 'fii' ? 'Cotas iniciais compradas à vista. Proventos sobre as cotas existentes no início do mês; aporte e recompra no fim. DY mensal = DY anual ÷ 12. Sobras ficam em caixa. Preço e distribuição constantes; sem impostos ou taxas. Sem reinvestimento, os proventos são retirados e não integram o patrimônio final.' : mode === 'goal' ? 'Renda nominal futura; capital = renda ÷ taxa mensal equivalente. Aportes constantes no fim do mês, sem impostos ou taxas. A renda em poder de compra atual desconta a inflação por divisão composta. Não representa uma taxa de retirada sustentável garantida.' : 'Referência bruta = (1 + inflação) × (1 + taxa real) − 1. Estimativa líquida anual = bruta × (1 − imposto). DY exigido = (1 + referência líquida) × (1 + prêmio) − 1. Teto = proventos 12M ÷ DY exigido. Comparação simplificada do vídeo, sem fluxos de caixa, tributação por prazo, custódia ou marcação a mercado.'}</p>
      <button type="submit" className="mt-4 rounded-full border border-white/15 bg-[#393939] px-5 py-2.5 text-xs text-white hover:bg-[#484848]">Calcular simulação</button>
    </form>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {result && <div className="mt-5 border-t border-white/10 pt-5" aria-live="polite">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{result.metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-[#797fff]/20 bg-[#797fff]/[0.05] p-4"><p className="text-xs text-white/50">{metric.label}</p><p className="mt-2 text-lg font-medium text-white">{metric.value}</p></div>)}</div>
      {result.requiredYield !== undefined && <><button type="button" onClick={() => onUseYield(result.requiredYield!, { method: 'fii', fii_inflation: values.inflation / 100, fii_treasury: values.treasury / 100, fii_tax: values.tax / 100, fii_premium: values.premium / 100 })} className="mt-4 rounded-full border border-[#797fff]/30 px-4 py-2 text-xs text-[#c2c5ff]">Exibir preço-teto de FIIs em Ativos</button><p className="mt-2 text-[11px] text-white/40">Abre uma estratégia de FIIs com estas premissas. Ao salvar, a tabela usa os proventos de 12 meses de cada FII; o valor manual desta simulação não é aplicado a todos os fundos. As taxas permanecem fixas até você editá-las.</p></>}
      {result.rows && <details className="mt-4"><summary className="cursor-pointer text-xs text-[#a0a7ff]">Ver evolução mês a mês</summary><div className="mt-3 max-h-80 overflow-auto"><table className="w-full whitespace-nowrap text-xs"><caption className="sr-only">Evolução mensal da simulação</caption><thead><tr>{['Mês', 'Patrimônio', 'Aportado', 'Ganho acumulado', ...(mode === 'fii' ? ['Cotas', 'Caixa'] : [])].map((label) => <th key={label} className="px-3 py-2 text-right font-normal text-white/40">{label}</th>)}</tr></thead><tbody>{result.rows.map((row) => <tr key={row.month} className="border-t border-white/5 text-white/70"><td className="px-3 py-2 text-right">{row.month}</td>{[row.balance, row.invested, row.earnings].map((value, index) => <td key={index} className="px-3 py-2 text-right">{fmtMoney(value)}</td>)}{mode === 'fii' && <><td className="px-3 py-2 text-right">{row.shares}</td><td className="px-3 py-2 text-right">{fmtMoney(row.cash)}</td></>}</tr>)}</tbody></table></div></details>}
    </div>}
    <p className="mt-4 text-[11px] leading-relaxed text-white/35">Simulações não lançam compras na carteira. Distribuições, preços, inflação e juros podem mudar. Resultados não são promessa de rendimento.</p>
    <p className="mt-4 text-[11px] text-white/35">Referência desta simulação: Diego Bechara - canal A Cara da Riqueza.</p>
  </section>
}
