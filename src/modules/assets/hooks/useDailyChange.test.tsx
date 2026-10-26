import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { useDailyChange } from './useDailyChange'
import { positionService } from '../../portfolio/services/positionService'
import type { LatestQuote } from '../../portfolio/types'

vi.mock('../../portfolio/services/positionService', () => ({ positionService: { previousClose: vi.fn() } }))

it('compara com o pregão anterior, não com custo, e não inventa variação sem base', async () => {
  vi.mocked(positionService.previousClose).mockResolvedValue(40)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const quote = { ticker: 'PETR4', close: 38, date: '2026-10-26' } as LatestQuote
  const { result, rerender } = renderHook(({ quote }) => useDailyChange(quote), { wrapper, initialProps: { quote } })
  await waitFor(() => expect(result.current).toBeCloseTo(-5))
  expect(positionService.previousClose).toHaveBeenCalledWith('PETR4', '2026-10-26')
  vi.mocked(positionService.previousClose).mockResolvedValue(null)
  rerender({ quote: { ...quote, ticker: 'SEMBASE' } })
  await waitFor(() => expect(positionService.previousClose).toHaveBeenCalledWith('SEMBASE', '2026-10-26'))
  expect(result.current).toBeNull()
})
