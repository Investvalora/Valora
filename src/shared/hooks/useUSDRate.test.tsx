import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useUSDRate } from './useUSDRate'
import { USDRate, usdRateService } from '../services/usdRateService'

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const LIVE_RATE: USDRate = { rate: 5.1253, source: 'bcb', isFallback: false, date: '2026-09-04' }

const FALLBACK_RATE: USDRate = { rate: 5, source: 'default', isFallback: true, date: null }

describe('useUSDRate', () => {
  it('entrega a taxa da cadeia', async () => {
    vi.spyOn(usdRateService, 'getUSDRate').mockResolvedValue(LIVE_RATE)

    const { result } = renderHook(() => useUSDRate(), { wrapper: wrapperFor(createQueryClient()) })

    await waitFor(() => expect(result.current.data).toEqual(LIVE_RATE))
    expect(result.current.isError).toBe(false)
  })

  /**
   * O fallback não é erro: quem consome precisa de um número e do aviso de que
   * ele é aproximado, não de um estado de falha que apagaria o card.
   */
  it('fallback chega como dado, não como erro', async () => {
    vi.spyOn(usdRateService, 'getUSDRate').mockResolvedValue(FALLBACK_RATE)

    const { result } = renderHook(() => useUSDRate(), { wrapper: wrapperFor(createQueryClient()) })

    await waitFor(() => expect(result.current.data?.isFallback).toBe(true))
    expect(result.current.isError).toBe(false)
    expect(result.current.data?.rate).toBe(5)
  })

  /**
   * `staleTime` de 1h: uma taxa de câmbio diária não justifica ida à rede a cada
   * montagem de componente. Com `staleTime` 0 a segunda montagem refetcharia.
   */
  it('não refetcha a cada montagem', async () => {
    const getUSDRate = vi.spyOn(usdRateService, 'getUSDRate').mockResolvedValue(LIVE_RATE)
    const queryClient = createQueryClient()
    const wrapper = wrapperFor(queryClient)

    const first = renderHook(() => useUSDRate(), { wrapper })
    await waitFor(() => expect(first.result.current.data).toEqual(LIVE_RATE))
    first.unmount()

    const second = renderHook(() => useUSDRate(), { wrapper })
    await waitFor(() => expect(second.result.current.data).toEqual(LIVE_RATE))

    expect(getUSDRate).toHaveBeenCalledTimes(1)
  })
})
