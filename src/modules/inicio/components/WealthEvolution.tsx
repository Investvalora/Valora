import { ChartPeriodFilter } from '../../../shared/components/ChartPeriodFilter'
import { useState } from 'react'
import { useDashboard } from '../../dashboard/hooks/useDashboard'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { ASSET_CLASS_COLOR, assetClassLabel } from '../../portfolio/composition'
import type { AssetType } from '../../portfolio/types'
import { chartDateRange, useChartPeriod } from '../../../shared/stores/useChartPeriod'
import { EvolucaoChart } from './EvolucaoChart'

const selectClass = 'min-h-10 rounded-lg border border-white/15 bg-[#262626] px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-nf-blue'

export function WealthEvolution() {
  const { selectedWallet } = useWallets()
  const { period, from, to } = useChartPeriod()
  const [type, setType] = useState<AssetType | 'all'>('all')
  const range = chartDateRange(period, from, to)
  const valid = Boolean(range.from && range.to && range.from <= range.to)
  const dashboard = useDashboard(selectedWallet?.id ?? '', valid ? { ...range, type } : { type })
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#33AA3B]/85" />Valor aplicado</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#A9E0AC]/80" />Ganho de capital</span>
        </div>
        <div className="flex max-w-full flex-wrap items-start gap-3">
        <ChartPeriodFilter />
        <label className="flex flex-col gap-1 text-xs text-white/60">
          <span className="sr-only">Tipo de ativo</span>
          <select aria-label="Tipo de ativo do gráfico" className={selectClass} value={type} onChange={(event) => setType(event.target.value as AssetType | 'all')}>
            <option value="all">Todos os tipos</option>
            {(Object.keys(ASSET_CLASS_COLOR) as AssetType[]).map((value) => <option key={value} value={value}>{assetClassLabel(value)}</option>)}
          </select>
        </label>
        </div>
      </div>
      {!valid ? <p role="alert" className="py-8 text-sm text-red-300">Informe as duas datas, com a data inicial anterior ou igual à final.</p>
        : dashboard.isLoading ? <p role="status" className="py-8 text-sm text-white/50">Carregando evolução…</p>
        : dashboard.isError ? <button type="button" onClick={dashboard.refetch} className="py-8 text-sm text-red-300">Não foi possível carregar a evolução. Tentar novamente</button>
        : <div className="overflow-x-auto" role="region" aria-label="Evolução mensal com rolagem horizontal" tabIndex={0}><div style={{ minWidth: dashboard.monthlySeries.length > 12 ? dashboard.monthlySeries.length * 64 + 66 : undefined }}><EvolucaoChart data={dashboard.monthlySeries} /></div></div>}
      {valid && !dashboard.isLoading && !dashboard.isError && dashboard.monthlySeries.length > 0 && <p className="mt-2 text-xs text-white/50 md:hidden">Deslize o gráfico para ver os meses. Toque em uma barra para ver os valores.</p>}
      <p className="mt-3 text-xs text-white/40">Histórico em reais pelo câmbio de cada mês. Renda fixa: estimativa bruta dos títulos cadastrados, considerando cupons e resgates registrados, sem impostos nem marcação a mercado. Meses sem preços ou índices suficientes são omitidos.</p>
    </div>
  )
}
