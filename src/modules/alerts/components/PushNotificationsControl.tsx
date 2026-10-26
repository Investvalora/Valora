import { useEffect, useState } from 'react'
import { supabase } from '../../../shared/services/supabaseClient'
import { useAuth } from '../../auth/hooks/useAuth'

const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

function decodeVapidKey(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Tente novamente.'
}

export function PushNotificationsControl() {
  const { user } = useAuth()
  const userId = user?.id
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const supported = typeof window !== 'undefined' &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  useEffect(() => {
    if (!userId || !supported || !publicKey) return
    let cancelled = false
    async function refresh() {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (!subscription) return
        const { data, error: queryError } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle()
        if (queryError) throw queryError
        if (!cancelled) setEnabled(Boolean(data))
      } catch (cause) {
        if (!cancelled) setError(`Não foi possível consultar o push: ${errorMessage(cause)}`)
      }
    }
    void refresh()
    return () => { cancelled = true }
  }, [userId, supported])

  if (!supported) return null

  async function toggle() {
    if (!userId || !publicKey || busy) return
    setBusy(true)
    setError('')
    try {
      if (!enabled && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setError('Permissão de notificações não concedida no navegador.')
          return
        }
      }

      const registration = await navigator.serviceWorker.ready
      const previous = await registration.pushManager.getSubscription()
      if (enabled) {
        if (previous) {
          const { error: deleteError } = await supabase.from('push_subscriptions')
            .delete().eq('user_id', userId).eq('endpoint', previous.endpoint)
          if (deleteError) throw deleteError
          await previous.unsubscribe()
        }
        setEnabled(false)
        return
      }

      // Uma inscrição do navegador pode pertencer a uma sessão anterior.
      // Gerar outra impede associar o mesmo endpoint a contas diferentes.
      if (previous) await previous.unsubscribe()
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey),
      })
      const keys = subscription.toJSON().keys
      if (!keys?.p256dh || !keys.auth) {
        await subscription.unsubscribe()
        throw new Error('O navegador não forneceu as chaves da inscrição.')
      }
      const { error: insertError } = await supabase.from('push_subscriptions').insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      })
      if (insertError) {
        await subscription.unsubscribe()
        throw insertError
      }
      setEnabled(true)
    } catch (cause) {
      setError(`Não foi possível alterar o push: ${errorMessage(cause)}`)
    } finally {
      setBusy(false)
    }
  }

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
          disabled={busy || !publicKey}
          aria-pressed={enabled}
          className="min-h-10 rounded-xl border border-white/20 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Aguarde...' : enabled ? 'Desativar push' : 'Ativar push'}
        </button>
      </div>
      {!publicKey && <p className="mt-2 text-xs text-nf-muted">Push ainda não configurado neste ambiente.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  )
}
