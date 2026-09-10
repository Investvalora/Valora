import { useGenerateAlerts, useUpdateAlertStatus } from '../hooks/useAlertMutations'
import { useAlerts } from '../hooks/useAlerts'
import type { Alert } from '../types'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function AlertCard({ alert }: { alert: Alert }) {
  const updateStatus = useUpdateAlertStatus()
  const isIgnored = alert.status === 'ignorado'

  return (
    <article className="rounded-lg border border-dark-border bg-dark-surface p-5" aria-label={alert.title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">{alert.ticker}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{alert.title}</h2>
        </div>
        <span className="rounded-full border border-dark-border px-2 py-1 text-xs text-gray-300">{alert.status}</span>
      </div>
      <p className="mt-3 text-sm text-gray-300">{alert.description}</p>
      <p className="mt-3 text-xs text-gray-400">Criado em {formatDate(alert.created_at)}</p>
      {!isIgnored && (
        <div className="mt-4 flex flex-wrap gap-3">
          {alert.status === 'novo' && (
            <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'lido' })} className="rounded-lg border border-blue-500 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50">
              Marcar como lido
            </button>
          )}
          <button type="button" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ alertId: alert.id, status: 'ignorado' })} className="rounded-lg border border-gray-500 px-3 py-2 text-sm text-gray-200 hover:bg-gray-500/10 disabled:cursor-not-allowed disabled:opacity-50">
            Ignorar
          </button>
        </div>
      )}
      {updateStatus.isError && <p className="mt-3 text-sm text-red-300" role="alert">Não foi possível atualizar este alerta. Tente novamente.</p>}
    </article>
  )
}

export function AlertsPage() {
  const { data: alerts = [], isLoading, isError, refetch } = useAlerts()
  const generateAlerts = useGenerateAlerts()

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Alertas</h1>
          <p className="mt-1 text-sm text-gray-400">Inconsistências encontradas na sua carteira.</p>
        </div>
        <button type="button" onClick={() => generateAlerts.mutate()} disabled={generateAlerts.isPending} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
          {generateAlerts.isPending ? 'Atualizando...' : 'Atualizar alertas'}
        </button>
      </header>

      {generateAlerts.isError && <p className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300" role="alert">Não foi possível gerar alertas. A lista atual continua disponível.</p>}
      {isError && <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300" role="alert"><p>Não foi possível carregar seus alertas.</p><button type="button" onClick={() => refetch()} className="mt-2 underline">Tentar novamente</button></div>}
      {isLoading ? <p className="text-sm text-gray-400">Carregando alertas...</p> : isError && alerts.length === 0 ? null : alerts.length === 0 ? <div className="rounded-lg border border-dashed border-dark-border p-10 text-center"><p className="font-medium text-gray-300">Nenhum alerta encontrado</p><p className="mt-1 text-sm text-gray-400">Atualize os alertas para verificar sua carteira.</p></div> : <div className="space-y-4">{alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}</div>}
    </div>
  )
}