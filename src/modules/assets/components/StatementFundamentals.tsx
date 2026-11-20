import { useEffect, useState } from 'react'
import { latestStatement, type StatementSnapshot } from '../services/statementCatalogService'
import { STATEMENT_METRICS } from '../../../shared/indicators/statementCatalog'
import { LoadingState } from '../../../shared/components/LoadingState'
import { parseIsoDate } from '../../../shared/utils/isoDate'

/** Shared issuer evidence. Never substitutes personal income or silent rules. */
export function StatementFundamentals({ ticker }: { ticker: string }) {
  const [state, setState] = useState<{ ticker: string; row: StatementSnapshot | null; error: boolean; loading: boolean }>({ ticker, row: null, error: false, loading: true })
  useEffect(() => {
    let active = true
    setState({ ticker, row: null, error: false, loading: true })
    latestStatement(ticker).then(row => { if (active) setState({ ticker, row, error: false, loading: false }) }, () => { if (active) setState({ ticker, row: null, error: true, loading: false }) })
    return () => { active = false }
  }, [ticker])
  const row = state.ticker === ticker ? state.row : null
  return <StatementFundamentalsView row={row} loading={state.loading || state.ticker !== ticker} error={state.error} />
}

export function StatementFundamentalsView({ row, loading = false, error = false }: { row: StatementSnapshot | null; loading?: boolean; error?: boolean }) {
  const date = (s: string) => parseIsoDate(s)?.toLocaleDateString('pt-BR') ?? s
  const source = row && /^\d{10}$/.test(row.cik) && /^\d{10}-\d{2}-\d{6}$/.test(row.accession)
    ? `https://www.sec.gov/Archives/edgar/data/${Number(row.cik)}/${row.accession.replace(/-/g, '')}/${row.accession}-index.html` : null
  return <section aria-label="Indicadores por demonstrativo oficial" className="mt-5 border-t border-white/10 pt-4">
    <h4 className="text-sm font-semibold text-white">Demonstrativo anual oficial</h4>
    {loading ? <LoadingState label="Consultando demonstrativo oficial…" />
      : error ? <p role="alert" className="mt-2 text-sm text-amber-200">Não foi possível consultar os demonstrativos. Tente novamente mais tarde.</p>
        : !row ? <p className="mt-2 text-xs text-white/60">Sem demonstrativo validado no catálogo para este ativo. Isso não significa que os indicadores sejam zero.</p>
          : <>
            <p className="my-3 text-xs text-white/60">US-GAAP · USD · exercício encerrado em {date(row.period_end)} · documento de {date(row.filing_date)}. {source && <a href={source} target="_blank" rel="noreferrer" className="underline">Consultar fonte SEC</a>}</p>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.values(STATEMENT_METRICS).map(metric => {
              const value = row[metric.column]
              return <div key={metric.column} className="rounded-xl border border-white/10 p-3"><dt className="text-xs text-white/60">{metric.label}</dt><dd className="mt-1 text-sm font-semibold text-white">{typeof value !== 'number' || !Number.isFinite(value) ? 'Indisponível' : metric.unit === 'USD' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(value) : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${metric.unit}`}</dd></div>
            })}</dl>
            <details className="mt-3 text-xs leading-relaxed text-white/60"><summary className="cursor-pointer py-2">Como calculamos e quais são os limites</summary>
              <p>Margem = resultado operacional ÷ receita. FCL = fluxo operacional − pagamentos de imobilizado; não é FCFF nem inclui automaticamente intangíveis. EBITDA calculado = resultado operacional + depreciação, exaustão e amortização, sem ajustes gerenciais.</p>
              <p className="mt-2">ROIC usa NOPAT e capital médio contábil: patrimônio incluindo minoritários + dívida financeira total − caixa equivalente. Imposto efetivo válido entre 0% e 100%; capital positivo. Pode diferir do ROIC divulgado pelo emissor. Exemplo: NOPAT de US$10 e capital médio de US$100 resultam em 10%.</p>
              <p className="mt-2">A extração automatizada de dívida exige componentes completos e ausência explícita de arrendamento financeiro. Se houver arrendamentos ou dados insuficientes para conciliá-los, dívida/EBITDA e ROIC ficam indisponíveis, sem presumir saldo zero. Arrendamentos operacionais não são capitalizados nesta convenção.</p>
              <p className="mt-2">CAGR exige seis exercícios consecutivos positivos, mesma moeda e conceito, sem divergências de valores reapresentados observadas. Ausências ficam indisponíveis. Exemplo: receita de 100 para 200 em cinco anos equivale a cerca de 14,87% ao ano. Estes dados não alteram score, estratégias ou alertas automaticamente.</p>
            </details>
          </>}
  </section>
}
