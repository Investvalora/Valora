import { renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useRetainedChartData } from './useRetainedChartData'

it('mantém a série anterior durante a troca de período sem misturar ativos ou carteiras', () => {
  const { result, rerender } = renderHook(
    ({ scope, period, data, isLoading }) => useRetainedChartData(scope, period, data, isLoading),
    { initialProps: { scope: 'ativo:A', period: '1A', data: [1, 2], isLoading: false } },
  )

  rerender({ scope: 'ativo:A', period: '5A', data: [], isLoading: true })
  expect(result.current).toMatchObject({ period: '1A', data: [1, 2], retained: true })

  rerender({ scope: 'ativo:A', period: '5A', data: [3, 4], isLoading: false })
  expect(result.current).toMatchObject({ period: '5A', data: [3, 4], retained: false })

  rerender({ scope: 'ativo:B', period: '1M', data: [], isLoading: true })
  expect(result.current).toMatchObject({ period: '1M', data: [], retained: false })
})
