import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabaseMock } from '../../../test/supabaseMock'
import { AllocationTargets } from './AllocationTargets'
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: supabaseMock.client }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('../hooks/useAtivosValuation', () => ({ useAtivosValuation: () => ({ totalBRL: 1000, complete: true, compositionRows: [{ type: 'stock_br', marketValueBRL: 200 }, { type: 'fii', marketValueBRL: 800 }] }) }))
beforeEach(() => supabaseMock.reset())
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><AllocationTargets walletId="wallet" /></QueryClientProvider>)
}
it('carrega, valida e salva a meta com escopo de dono e carteira', async () => {
  supabaseMock.on('wallets', (chain) => chain.calls.some((call) => call.method === 'update') ? { data: { id: 'wallet' }, error: null } : { data: { allocation_targets: {} }, error: null })
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Editar metas' }))
  fireEvent.click(screen.getByRole('button', { name: 'Salvar metas' }))
  expect(screen.getByRole('alert')).toHaveTextContent('somar 100%')
  expect(supabaseMock.chainsWith('wallets', 'update')).toHaveLength(0)
  fireEvent.change(screen.getByLabelText('Meta Ações BR'), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText('Meta FIIs'), { target: { value: '70' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar metas' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Metas salvas'))
  const saved = supabaseMock.chainsWith('wallets', 'update')[0]
  expect(saved.calls).toContainEqual({ method: 'eq', args: ['id', 'wallet'] })
  expect(saved.calls).toContainEqual({ method: 'eq', args: ['user_id', 'owner'] })
  expect(screen.getByRole('table')).toHaveTextContent('+R$ 100,00')
  expect(screen.getByRole('table')).toHaveTextContent('-R$ 100,00')
})
it('não oferece edição ao falhar o carregamento', async () => {
  supabaseMock.on('wallets', () => ({ data: null, error: new Error('offline') }))
  show()
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
  expect(screen.queryByRole('button', { name: 'Editar metas' })).not.toBeInTheDocument()
})
