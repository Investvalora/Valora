import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useChartMorph } from './useChartMorph'

afterEach(() => vi.restoreAllMocks())

it('desenha quadros intermediários antes de chegar à nova curva', () => {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  const interpolate = (from: number[], to: number[], progress: number) =>
    to.map((value, index) => from[index] + (value - from[index]) * progress)
  const canInterpolate = (from: number[], to: number[]) => from.length === to.length
  const first = [0, 10]
  const second = [10, 20]
  const { result, rerender } = renderHook(
    ({ data }) => useChartMorph('asset', data, interpolate, canInterpolate, true),
    { initialProps: { data: first } },
  )

  rerender({ data: second })
  expect(result.current).toBe(first)
  act(() => frames.shift()?.(180))
  expect(result.current[0]).toBeGreaterThan(0)
  expect(result.current[0]).toBeLessThan(10)
  act(() => frames.shift()?.(360))
  expect(result.current).toBe(second)
})
