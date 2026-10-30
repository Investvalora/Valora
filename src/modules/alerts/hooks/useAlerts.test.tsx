import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { useAlerts, useNewAlertsCount } from './useAlerts'
const server = vi.hoisted(() => ({ count: 0, calls: vi.fn() }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' }, loading: false }) }))
vi.mock('../services/alertsService', () => ({ alertsService: {
  listAlerts: async (userId: string) => { server.calls(userId); return server.count ? [{ id: 'new', status: 'novo' }] : [] },
  countNewAlerts: async (userId: string) => { server.calls(userId); return server.count },
} }))
afterEach(() => { vi.useRealTimers(); server.count = 0; server.calls.mockClear() })
it('atualiza lista e sino em dois clientes quando o servidor muda fora da aba', async () => {
  vi.useFakeTimers()
  const mount = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    return { client, ...renderHook(() => ({ list: useAlerts(), count: useNewAlertsCount() }), { wrapper }) }
  }
  const first = mount(), second = mount()
  await act(async () => { await vi.advanceTimersByTimeAsync(20) })
  expect(first.result.current.count.data).toBe(0)
  server.count = 1
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  for (const current of [first, second]) {
    expect(current.result.current.count.data).toBe(1)
    expect(current.result.current.list.data).toEqual([{ id: 'new', status: 'novo' }])
    current.unmount(); current.client.clear()
  }
  expect(server.calls.mock.calls.every(([owner]) => owner === 'owner')).toBe(true)
})
