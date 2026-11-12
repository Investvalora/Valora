import { formatIndicatorValue, indicatorValue, supportsIndicator } from '../../../shared/indicators/catalog'
import { PanelCard } from '../../../shared/components/PanelCard'
import { METRIC_LABELS, type FundamentalsRow, type ScoreMetric } from '../../score/types'
import type { AssetType } from '../../portfolio/types'
import { parseIsoDate } from '../../../shared/utils/isoDate'

export function FundamentalsPanel({ row, type, loading, error }: {
  row: FundamentalsRow | null; type: AssetType; loading?: boolean; error?: boolean
}) {
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
            const applicable = supportsIndicator(metric, type)
            const value = indicatorValue(row, metric, type)
            const available = value !== null
            return <div key={metric} className="rounded-xl border border-white/10 p-3">
              <dt className="text-xs text-white/60">{metric === 'debt_equity' ? 'Dívida/PL (%)' : METRIC_LABELS[metric]}</dt>
              <dd className="mt-1 text-sm font-semibold text-white">{!applicable ? 'Não se aplica' : available ? formatIndicatorValue(metric, value, 2) : 'Indisponível'}</dd>
            </div>
          })}
        </dl>
        {fund && <p className="mt-3 text-xs text-white/60">Para fundos, exibimos P/VP e DY. Os indicadores contábeis de empresas não são aplicados automaticamente.</p>}
        {row?.cvm_reference_date && <p className="mt-3 text-xs text-white/60">VPA complementado pelo informe oficial da CVM, competência {parseIsoDate(row.cvm_reference_date)?.toLocaleDateString('pt-BR') ?? row.cvm_reference_date}. O informe mensal não comprova recebimento de proventos.</p>}
      </>}
  </PanelCard>
}
