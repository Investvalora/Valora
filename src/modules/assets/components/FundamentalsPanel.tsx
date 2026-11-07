import { PanelCard } from '../../../shared/components/PanelCard'
import { METRIC_LABELS, type FundamentalsRow, type ScoreMetric } from '../../score/types'
import type { AssetType } from '../../portfolio/types'
import { parseIsoDate } from '../../../shared/utils/isoDate'

const equityTypes: AssetType[] = ['stock_br', 'stock_us', 'bdr']
export function FundamentalsPanel({ row, type, loading, error }: {
  row: FundamentalsRow | null; type: AssetType; loading?: boolean; error?: boolean
}) {
  const equity = equityTypes.includes(type)
  const fund = type === 'fii' || type === 'reit'
  const metrics = Object.keys(METRIC_LABELS) as ScoreMetric[]
  const real = row?.source !== 'seed' && row?.source !== 'synthetic'
  return <PanelCard>
    <h3 className="mb-2 text-sm font-semibold text-white">Indicadores fundamentalistas</h3>
    {loading ? <p role="status" className="text-sm text-white/60">Carregando indicadores…</p>
      : error ? <p role="alert" className="text-sm text-amber-200">Não foi possível carregar os indicadores.</p>
      : <>
        <p className="mb-4 text-xs text-white/60">{row && real ? `Referência: ${parseIsoDate(row.reference_date)?.toLocaleDateString('pt-BR') ?? row.reference_date}.${row.source ? ` Fonte: ${row.source}.` : ''}` : 'Sem dados reais disponíveis na fonte.'} Os indicadores podem ter datas diferentes da cotação atual.</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map(metric => {
            const applicable = equity || (fund && (metric === 'pvp' || metric === 'dy'))
            const value = row?.[metric]
            const available = real && typeof value === 'number' && Number.isFinite(value) && (metric !== 'debt_equity' || row?.source === 'yahoo')
            return <div key={metric} className="rounded-xl border border-white/10 p-3">
              <dt className="text-xs text-white/60">{metric === 'debt_equity' ? 'Dívida/PL (%)' : METRIC_LABELS[metric]}</dt>
              <dd className="mt-1 text-sm font-semibold text-white">{!applicable ? 'Não se aplica' : available ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${['dy', 'roe', 'net_margin', 'debt_equity'].includes(metric) ? '%' : ''}` : 'Indisponível'}</dd>
            </div>
          })}
        </dl>
        {fund && <p className="mt-3 text-xs text-white/60">Para fundos, exibimos P/VP e DY. Os indicadores contábeis de empresas não são aplicados automaticamente.</p>}
      </>}
  </PanelCard>
}
