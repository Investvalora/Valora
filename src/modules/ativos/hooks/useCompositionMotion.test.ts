import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useCompositionMotion } from './useCompositionMotion'
import type { CompositionFrame } from '../utils/compositionMotion'

afterEach(() => { vi.unstubAllGlobals(); delete document.documentElement.dataset.inputMode })

function setupMotion(reduced = false) {
  const frames = new Map<number, FrameRequestCallback>()
  let id = 0
  const cancel = vi.fn((frameId: number) => frames.delete(frameId))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.stubGlobal('requestAnimationFrame', vi.fn((frame: FrameRequestCallback) => { frames.set(++id, frame); return id }))
  vi.stubGlobal('cancelAnimationFrame', cancel)
  return { cancel, tick: (now: number) => {
    const next = frames.entries().next().value
    if (next) { frames.delete(next[0]); act(() => next[1](now)) }
  } }
}

function data(percent: number, color = '#ff0000'): CompositionFrame {
  return { totalBRL: 1000, slices: [
    { id: 'a', label: 'A', percent, valueBRL: percent * 10, color, international: false, topTicker: null },
    { id: 'b', label: 'B', percent: 100 - percent, valueBRL: (100 - percent) * 10, color: '#00ff00', international: false, topTicker: null },
  ] }
}

it('transforma proporções, cores e valores sem zerar ou esvaziar a rosca', () => {
  const { tick, cancel } = setupMotion()
  const { result, rerender, unmount } = renderHook(({ target }) => useCompositionMotion('wallet', target), { initialProps: { target: data(80) } })
  expect(result.current.frame.slices[0].percent).toBe(80)
  expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  rerender({ target: data(20, '#0000ff') })
  expect(result.current.frame.slices[0].percent).toBe(80)
  tick(0)
  tick(350)
  expect(result.current.frame.slices[0].percent).toBe(50)
  expect(result.current.frame.slices[0].valueBRL).toBe(500)
  expect(result.current.frame.slices[0].color).toBe('#800080')
  expect(result.current.frame.slices.reduce((sum, slice) => sum + slice.percent, 0)).toBe(100)
  expect(result.current.frame.totalBRL).toBe(1000)
  tick(700)
  expect(result.current.frame.slices[0].percent).toBe(20)
  expect(result.current.progress).toBe(1)
  unmount()
  expect(cancel).toHaveBeenCalled()
})

it('continua do quadro intermediário em trocas rápidas e ignora dados equivalentes', () => {
  const { tick } = setupMotion()
  const { result, rerender } = renderHook(({ target }) => useCompositionMotion('wallet', target), { initialProps: { target: data(80) } })
  rerender({ target: data(20) })
  tick(0)
  tick(350)
  expect(result.current.frame.slices[0].percent).toBe(50)
  rerender({ target: data(90) })
  expect(result.current.frame.slices[0].percent).toBe(50)
  tick(400)
  tick(750)
  expect(result.current.frame.slices[0].percent).toBe(70)
  rerender({ target: data(90) })
  expect(result.current.frame.slices[0].percent).toBe(70)
  tick(1100)
  expect(result.current.frame.slices[0].percent).toBe(90)
})

it('apresenta os valores finais imediatamente com movimento reduzido', () => {
  setupMotion(true)
  const { result, rerender } = renderHook(({ target }) => useCompositionMotion('wallet', target), { initialProps: { target: data(80) } })
  rerender({ target: data(20) })
  expect(result.current.frame.slices[0].percent).toBe(20)
  expect(result.current.progress).toBe(1)
  expect(window.requestAnimationFrame).not.toHaveBeenCalled()
})

it('não usa posições da carteira anterior ao trocar de carteira', () => {
  setupMotion()
  const { result, rerender } = renderHook(({ wallet, target }) => useCompositionMotion(wallet, target), { initialProps: { wallet: 'a', target: data(80) } })
  rerender({ wallet: 'b', target: data(20) })
  expect(result.current.frame.slices[0].percent).toBe(20)
  expect(window.requestAnimationFrame).not.toHaveBeenCalled()
})

it('preserva navegação por teclado imediata sem reiniciar o morph', () => {
  setupMotion()
  document.documentElement.dataset.inputMode = 'keyboard'
  const { result, rerender } = renderHook(({ target }) => useCompositionMotion('wallet', target), { initialProps: { target: data(80) } })
  rerender({ target: data(20) })
  expect(result.current.frame.slices[0].percent).toBe(20)
  expect(window.requestAnimationFrame).not.toHaveBeenCalled()
})
