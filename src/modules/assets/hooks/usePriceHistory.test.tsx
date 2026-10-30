import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { usePriceHistory } from './usePriceHistory'
const list = vi.hoisted(() => vi.fn().mockResolvedValue([]))
vi.mock('../../wealth/services/wealthService', () => ({ wealthService: { listPriceHistory: list } }))
afterEach(() => { vi.useRealTimers(); list.mockClear() })
it.each([
  ['2026-10-30T12:00:00Z', '2021-10-30'],
  ['2024-02-29T12:00:00Z', '2019-02-28'],
])('consulta cinco anos de calendário desde %s e mantém Tudo independente', async (now, since) => {
  list.mockResolvedValue([])
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result, rerender } = renderHook(({ period }: { period: '5A' | 'Tudo' }) => usePriceHistory('radl3', period), { wrapper, initialProps: { period: '5A' as '5A' | 'Tudo' } })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(list).toHaveBeenCalledWith(['RADL3'], since)
  rerender({ period: 'Tudo' })
  await waitFor(() => expect(list).toHaveBeenCalledWith(['RADL3'], '1970-01-01'))
})
