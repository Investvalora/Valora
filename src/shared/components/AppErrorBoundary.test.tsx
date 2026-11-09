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

it('atualiza offline/reconexão sem recarregar automaticamente nem repetir a tela', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const connection = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  const screenRender = vi.fn((): never => { throw new Error('Failed to fetch dynamically imported module: private-path') })
  function Screen() { return screenRender() }
  render(<AppErrorBoundary><Screen /></AppErrorBoundary>)
  expect(screen.getByRole('heading')).toHaveTextContent('Sem conexão')
  expect(screen.getByRole('button', { name: 'Aguardando conexão' })).toBeDisabled()
  const attempts = screenRender.mock.calls.length
  connection.mockReturnValue(true)
  fireEvent(window, new Event('online'))
  expect(screen.getByRole('heading')).toHaveTextContent('Não foi possível carregar esta tela')
  expect(screen.getByRole('button', { name: 'Recarregar aplicativo' })).toBeEnabled()
  expect(screenRender).toHaveBeenCalledTimes(attempts)
  expect(screen.queryByText(/private-path/)).not.toBeInTheDocument()
  connection.mockReturnValue(false)
  fireEvent(window, new Event('offline'))
  expect(screen.getByRole('button', { name: 'Aguardando conexão' })).toBeDisabled()
})

it('permite nova tentativa explícita de renderização depois de reconectar', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const connection = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  let broken = true
  function Screen() { if (broken) throw new Error('render'); return <p>Recuperado após reconexão</p> }
  render(<AppErrorBoundary><Screen /></AppErrorBoundary>)
  broken = false
  connection.mockReturnValue(true)
  fireEvent(window, new Event('online'))
  expect(screen.queryByText('Recuperado após reconexão')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(screen.getByText('Recuperado após reconexão')).toBeInTheDocument()
})
