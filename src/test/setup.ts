// Matchers de DOM (`toBeInTheDocument`, `toHaveValue`, ...) e a limpeza
// automática do React Testing Library após cada teste.
//
// O import `/vitest` registra os matchers via `expect.extend` do próprio
// Vitest e traz a ampliação de tipos, o que funciona com `globals: false`.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
