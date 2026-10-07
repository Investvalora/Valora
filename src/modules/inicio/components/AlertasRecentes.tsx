import { ArrowRight, Bell, TrendingUp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { PanelCard } from '../../../shared/components/PanelCard'
import { useAlerts } from '../../alerts/hooks/useAlerts'

export function AlertasRecentes() {
  const { data: alerts = [], isLoading, isError, refetch } = useAlerts()
  const recentAlerts = alerts.slice(0, 3)
  const newCount = alerts.filter((alert) => alert.status === 'novo').length

  return (
    <PanelCard className="flex w-[420px] shrink-0 flex-col" padding="p-6">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="flex-1 text-[15px] font-semibold text-white/80">Alertas recentes</h2>
        {newCount > 0 && (
          <span className="rounded-full border border-nf-blue/60 bg-nf-blue/12 px-2.5 py-0.5 text-[11px] text-nf-blue">
            {newCount} {newCount === 1 ? 'novo' : 'novos'}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        {isLoading && <p className="py-5 text-sm text-[#8F8F8F]">Carregando alertas…</p>}
        {isError && (
          <button type="button" onClick={() => void refetch()} className="self-start py-5 text-sm text-red-300">
            Não foi possível carregar os alertas. Tentar novamente
          </button>
        )}
        {!isLoading && !isError && recentAlerts.length === 0 && (
          <p className="py-5 text-sm text-[#8F8F8F]">Nenhum alerta recente.</p>
        )}
        {!isLoading && !isError && recentAlerts.map((alert, index) => {
          const isNew = alert.status === 'novo'
          const isValuation = alert.type === 'overvalued' || alert.type === 'opportunity'
          const Icon = isValuation ? TrendingUp : Bell
          const color = isValuation ? '#FF8FBE' : '#7987FF'

          return (
            <div key={alert.id} className={`flex items-center gap-3 py-2.5 ${index > 0 ? 'border-t border-white/[0.07]' : ''}`}>
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg" style={{ background: `${color}24` }} aria-hidden="true">
                <Icon className="h-4 w-4" strokeWidth={1.8} style={{ color }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{alert.title}</p>
                <p className="truncate text-[11px] text-[#8F8F8F]">{alert.description}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${isNew ? 'border-nf-blue/60 bg-nf-blue/12 text-nf-blue' : 'border-white/20 text-[#8F8F8F]'}`}>
                {isNew ? 'Novo' : alert.status === 'ignorado' ? 'Ignorado' : 'Lido'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 border-t border-white/[0.07] pt-4">
        <NavLink to="/alertas" className="flex items-center gap-1.5 text-[12px] font-medium text-nf-blue hover:underline">
          Ver todos os alertas
          <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        </NavLink>
      </div>
    </PanelCard>
  )
}
