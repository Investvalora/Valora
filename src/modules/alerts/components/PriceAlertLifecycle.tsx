import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks/useAuth'
import { alertsService } from '../services/alertsService'
import { Modal } from '../../../shared/components/Modal'
import type { Alert } from '../types'

export function PriceAlertLifecycle({ alert }: { alert: Alert }) {
  const { user } = useAuth()
  const client = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const change = useMutation({
    mutationFn: async (action: 'toggle' | 'delete') => {
      if (!user?.id || user.id !== alert.user_id) throw new Error('Sessão inválida.')
      if (action === 'delete') await alertsService.deletePriceAlert(user.id, alert.id)
      else await alertsService.setPriceAlertPaused(user.id, alert.id, !alert.paused)
    },
    onSuccess: async () => { setConfirm(false); await client.invalidateQueries({ queryKey: ['alerts', user?.id] }) },
  })
  if (alert.type !== 'price_target') return null
  const button = 'min-h-9 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 disabled:opacity-50'
  return <div className="flex min-w-0 flex-wrap items-center gap-2">
    {alert.paused && <span className="text-xs text-amber-200">Pausado</span>}
    <button type="button" className={button} disabled={change.isPending} aria-label={`${alert.paused ? 'Retomar' : 'Pausar'} alerta de ${alert.ticker}`} onClick={() => change.mutate('toggle')}>{alert.paused ? 'Retomar' : 'Pausar'}</button>
    <button type="button" className={button} disabled={change.isPending} onClick={() => setConfirm(true)} aria-label={`Excluir alerta de ${alert.ticker}`}>Excluir</button>
    {change.isError && <p role="alert" className="text-xs text-red-300">Não foi possível alterar o alerta. Tente novamente.</p>}
    <Modal isOpen={confirm} title={`Excluir alerta de ${alert.ticker}?`} onClose={() => setConfirm(false)} dismissible={!change.isPending}>
      <p className="mb-4 text-sm text-white/75">A exclusão é definitiva. Para interromper o monitoramento temporariamente, use Pausar.</p>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={change.isPending} onClick={() => setConfirm(false)}>Cancelar</button><button type="button" className={button} disabled={change.isPending} onClick={() => change.mutate('delete')}>{change.isPending ? 'Excluindo…' : 'Excluir definitivamente'}</button></div>
    </Modal>
  </div>
}
