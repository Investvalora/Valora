import { usePushNotifications } from '../hooks/usePushNotifications'

export function PushNotificationsControl() {
  const { enabled, busy, error, supported, configured, toggle } = usePushNotifications()
  if (!supported) return null

  return (
    <div className="mb-5 rounded-xl border border-white/[0.12] bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Notificações push</h2>
          <p className="mt-1 text-xs text-nf-muted">Receba um aviso neste navegador quando surgir um alerta novo.</p>
        </div>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy || !configured}
          aria-pressed={enabled}
          className="min-h-10 rounded-xl border border-white/20 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Aguarde...' : enabled ? 'Desativar push' : 'Ativar push'}
        </button>
      </div>
      {!configured && <p className="mt-2 text-xs text-nf-muted">Push ainda não configurado neste ambiente.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  )
}
