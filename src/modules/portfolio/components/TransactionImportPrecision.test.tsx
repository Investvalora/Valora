import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { supabaseMock } from '../../../test/supabaseMock'
import { TransactionImportPage } from './TransactionImportPage'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { ...supabaseMock.client, rpc: mocks.rpc } }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'qa-user' } }) }))
vi.mock('../hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'qa-wallet', name: 'QA isolada' } }) }))
vi.mock('../hooks/useTransactions', () => ({ useAllTransactions: () => ({ data: [], isPending: false, isError: false }) }))
vi.mock('../services/assetDataSync', () => ({ syncAssetData: vi.fn().mockResolvedValue(undefined) }))
beforeEach(() => {
  sessionStorage.clear(); supabaseMock.reset(); mocks.rpc.mockReset()
  supabaseMock.on('assets', () => ({ data: [{ ticker: 'TEST' }], error: null }))
  mocks.rpc.mockResolvedValue({ data: { count: 1, duplicate: false }, error: null })
})
afterEach(() => cleanup())
it('arquivo → prévia editável → mutation real → RPC preserva decimal sem passar por Number', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  render(<QueryClientProvider client={client}><MemoryRouter><TransactionImportPage /></MemoryRouter></QueryClientProvider>)
  const bytes = new TextEncoder().encode('data;ticker;tipo;quantidade;preço;corretagem\n2026-01-05;TEST;buy;9999999999.12345678;0.0001;0.0001')
  fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [{ name: 'precisao.csv', arrayBuffer: async () => bytes.buffer }] } })
  fireEvent.change(screen.getByLabelText('Formato numérico do arquivo'), { target: { value: 'decimal-point' } })
  await waitFor(() => expect(screen.getByLabelText('quantity linha 2')).toHaveValue('9999999999,12345678'))
  fireEvent.change(screen.getByLabelText('quantity linha 2'), { target: { value: '9999999999,12345679' } })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar importação' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }))
  await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('import_owned_transactions', {
    p_wallet_id: 'qa-wallet', p_file_name: 'precisao.csv', p_rows: [{ ticker: 'TEST', type: 'buy', quantity: '9999999999.12345679', price: '0.0001', brokerage_fee: '0.0001', transaction_date: '2026-01-05' }],
  }))
  expect(mocks.rpc).toHaveBeenCalledTimes(1)
  client.clear()
})
