import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { usePriceTargetMonitor } from './usePriceTargetMonitor'
import { alertsService } from '../services/alertsService'

const auth = vi.hoisted(() => ({ user: { id: 'owner' } as { id: string } | null }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('../services/alertsService', () => ({ alertsService: { checkPriceTargets: vi.fn() } }))
afterEach(() => { vi.useRealTimers(); auth.user = { id: 'owner' }; vi.clearAllMocks() })

it('verifica ao abrir e a cada minuto; atualiza listas/contador sem invalidar a própria verificação', async () => {
  vi.useFakeTimers()
  vi.mocked(alertsService.checkPriceTargets).mockResolvedValue({ triggered: 1 })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { unmount } = renderHook(() => usePriceTargetMonitor(), { wrapper })
  await act(async () => { await vi.advanceTimersByTimeAsync(10) })
  expect(alertsService.checkPriceTargets).toHaveBeenCalledTimes(1)
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['alerts', 'owner'], exact: true })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['alerts', 'owner', 'new-count'], exact: true })
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(alertsService.checkPriceTargets).toHaveBeenCalledTimes(2)
  unmount()
  client.clear()
})

it('não consulta sem sessão', async () => {
  auth.user = null
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { unmount } = renderHook(() => usePriceTargetMonitor(), { wrapper })
  expect(alertsService.checkPriceTargets).not.toHaveBeenCalled()
  unmount()
  client.clear()
})

it('verifica ao recuperar foco mesmo com refetch global desabilitado', async () => {
  vi.useFakeTimers()
  vi.mocked(alertsService.checkPriceTargets).mockResolvedValue({ triggered: 0 })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { unmount } = renderHook(() => usePriceTargetMonitor(), { wrapper })
  await act(async () => { await vi.advanceTimersByTimeAsync(10) })
  focusManager.setFocused(false)
  await act(async () => { focusManager.setFocused(true); await vi.advanceTimersByTimeAsync(10) })
  expect(alertsService.checkPriceTargets).toHaveBeenCalledTimes(2)
  unmount(); client.clear(); focusManager.setFocused(undefined)
})
