import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'
afterEach(() => vi.restoreAllMocks())
it('recupera falha de renderização mediante tentativa explícita', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  let broken = true
  function Screen() { if (broken) throw new Error('test'); return <p>Recuperado</p> }
  render(<AppErrorBoundary><Screen /></AppErrorBoundary>)
  expect(screen.getByRole('alert')).toHaveTextContent('Ocorreu um erro')
  broken = false
  fireEvent.click(screen.getByText('Tentar novamente'))
  expect(screen.getByText('Recuperado')).toBeInTheDocument()
})
it('explica falha de versão/chunk sem expor detalhes internos', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function Screen(): never { throw new Error('Failed to fetch dynamically imported module: secret-path') }
  render(<AppErrorBoundary><Screen /></AppErrorBoundary>)
  expect(screen.getByRole('button')).toHaveTextContent('Recarregar aplicativo')
  expect(screen.queryByText(/secret-path/)).not.toBeInTheDocument()
})
