import { act, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { ActivityFeedback } from './ActivityFeedback'

afterEach(() => { vi.useRealTimers() })
function setup() {
  vi.useFakeTimers()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><ActivityFeedback /></QueryClientProvider>)
  return client
}
it('indica consultas demoradas sem fabricar percentuais e desaparece ao terminar', async () => {
  const client = setup()
  let finish!: (value: number) => void
  await act(async () => {
    void client.fetchQuery({ queryKey: ['first'], queryFn: () => new Promise<number>(resolve => { finish = resolve }) })
    await vi.advanceTimersByTimeAsync(20)
  })
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(300) })
  expect(screen.getByRole('progressbar', { name: 'Carregando dados' })).not.toHaveAttribute('aria-valuenow')
  await act(async () => { finish(1); await vi.advanceTimersByTimeAsync(20) })
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  client.clear()
})
it('mantém atualizações com dados em cache silenciosas', async () => {
  const client = setup()
  client.setQueryData(['cached'], 1)
  let finish!: (value: number) => void
  await act(async () => {
    void client.fetchQuery({ queryKey: ['cached'], staleTime: 0, queryFn: () => new Promise<number>(resolve => { finish = resolve }) })
    await vi.advanceTimersByTimeAsync(400)
  })
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  await act(async () => { finish(2); await vi.advanceTimersByTimeAsync(20) })
  client.clear()
})
it('identifica gravações em andamento sem bloquear os controles da página', async () => {
  const client = setup()
  let finish!: () => void
  const mutation = client.getMutationCache().build(client, { mutationFn: () => new Promise<void>(resolve => { finish = resolve }) })
  await act(async () => { void mutation.execute(undefined); await vi.advanceTimersByTimeAsync(20) })
  await act(async () => { await vi.advanceTimersByTimeAsync(300) })
  expect(screen.getByRole('progressbar', { name: 'Salvando alterações' })).toBeInTheDocument()
  await act(async () => { finish(); await vi.advanceTimersByTimeAsync(20) })
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  client.clear()
})
