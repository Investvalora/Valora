// Matchers de DOM (`toBeInTheDocument`, `toHaveValue`, ...) e a limpeza
// automática do React Testing Library após cada teste.
//
// O import `/vitest` registra os matchers via `expect.extend` do próprio
// Vitest e traz a ampliação de tipos, o que funciona com `globals: false`.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * jsdom não implementa `ResizeObserver`, e o `ResponsiveContainer` do Recharts
 * depende dele para se medir: sem o dublê, montar qualquer gráfico lança e o
 * teste passaria a exercitar o caminho de erro em vez do gráfico.
 *
 * No-op de propósito: em jsdom o container mede 0×0 e a pizza não desenha de
 * qualquer forma. Nenhum teste asserta sobre o SVG — a informação vive na
 * legenda textual, que é o que precisa ser verificado.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

afterEach(() => {
  cleanup()
})
