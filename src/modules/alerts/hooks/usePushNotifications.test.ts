import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('conclui a consulta mesmo quando o navegador ainda não tem inscrição', async () => {
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'configured-public-key')
  vi.resetModules()
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission: 'default' })
  vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: async () => null } }) } })
  const { usePushNotifications: useHook } = await import('./usePushNotifications')
  const { result } = renderHook(() => useHook())
  await waitFor(() => expect(result.current.ready).toBe(true))
  expect(result.current.enabled).toBe(false)
  expect(result.current.error).toBe('')
})
