import { lazy, Suspense, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { benchmarkService } from '../services/benchmarkService'
import { inflationComparison } from '../utils/inflationComparison'
import { toIsoDate } from '../../../shared/utils/isoDate'
import type { PerformanceSeries } from '../types'

const Chart = lazy(() => import('./PerformanceLineChart'))

export function InflationComparison({ portfolio }: { portfolio: PerformanceSeries }) {
  const since = portfolio.points[0]?.date ?? ''
  const query = useQuery({
    queryKey: ['benchmarks', 'ipca-monthly', since],
    queryFn: () => benchmarkService.listMonthlyInflation(since),
    enabled: Boolean(since), staleTime: 3600000, retry: 1,
  })
  const today = toIsoDate(new Date())
  const series = useMemo(() => inflationComparison(portfolio, query.data ?? [], today), [portfolio, query.data, today])
  const hasData = series[0].points.length > 1
  return (
    <section aria-label="Comparação com a inflação" className="rounded-2xl border border-white/[0.08] bg-[#1B1B1B] p-4 md:p-6">
      <h3 className="mb-2 text-sm font-semibold text-white">Carteira × IPCA — meses completos publicados</h3>
      <p className="mb-4 text-xs text-white/50">Carteira e inflação partem do mesmo fechamento mensal. O mês inicial parcial é excluído; a comparação termina no último mês consecutivo com IPCA publicado e histórico da carteira completo. Não há estimativa diária nem cálculo de rentabilidade real.</p>
      {query.isLoading ? <p role="status" className="text-sm text-white/60">Carregando IPCA…</p>
        : query.isError ? <p role="alert" className="text-sm text-white/60">Não foi possível carregar o IPCA. <button type="button" className="underline" onClick={() => void query.refetch()}>Tentar novamente</button></p>
          : hasData ? <Suspense fallback={<p className="text-sm text-white/60">Carregando gráfico…</p>}><Chart series={series} /></Suspense>
            : <p role="status" className="text-sm text-white/60">Não há meses completos publicados em comum com o histórico disponível da carteira. O mês ainda não divulgado permanece indisponível.</p>}
      <p className="mt-3 text-xs text-white/40">Fonte: <a className="underline" href="https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=433" target="_blank" rel="noreferrer">Banco Central, SGS 433 — IPCA mensal</a>.</p>
    </section>
  )
}
