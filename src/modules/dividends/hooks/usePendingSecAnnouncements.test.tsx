import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePendingSecAnnouncements } from './usePendingSecAnnouncements'
const mocks = vi.hoisted(() => ({ wallet: 'one', user: 'user-one', list: vi.fn() }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: mocks.user } }) }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: mocks.wallet } }) }))
vi.mock('../../portfolio/hooks/usePositions', () => ({ usePositions: (wallet: string) => ({ data: wallet === 'one' ? [{ ticker: 'COST' }] : [{ ticker: 'MA' }], isSuccess: true, isLoading: false, isError: false }) }))
vi.mock('../services/secAnnouncementsService', () => ({ listPendingSecAnnouncements: mocks.list }))
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.wallet = 'one'; mocks.user = 'user-one' })
it('troca o escopo e o cache por carteira e conta sem reusar os anúncios anteriores', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  mocks.list.mockImplementation(async (tickers: string[]) => [{ ticker: tickers[0] }])
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result, rerender } = renderHook(() => usePendingSecAnnouncements('1A'), { wrapper })
  await waitFor(() => expect(result.current.data?.[0].ticker).toBe('COST'))
  mocks.wallet = 'two'; mocks.user = 'user-two'; rerender()
  expect(result.current.data).toBeUndefined()
  await waitFor(() => expect(result.current.data?.[0].ticker).toBe('MA'))
  expect(mocks.list.mock.calls.map(call => call[0])).toEqual([['COST'], ['MA']])
  client.clear()
})
