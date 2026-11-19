import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { ReceiptImport } from './ReceiptImport'
import { RECEIPT_HEADER } from '../utils/receiptCsv'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../../shared/services/supabaseClient', () => ({ supabase: { rpc } }))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'qa-wallet', name: 'QA' } }) }))

beforeEach(() => { rpc.mockReset() })
async function openFile() {
  render(<QueryClientProvider client={new QueryClient()}><ReceiptImport /></QueryClientProvider>)
  fireEvent.click(screen.getByText('Importar recebimentos'))
  const text = RECEIPT_HEADER+'\nnomad;qa-ref;2020-01-01;MA;dividend;USD;0.06;0.02;0;0.04;;;'
  const bytes = new TextEncoder().encode(text)
  const file = new File([], 'qa.csv', { type: 'text/csv' })
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer })
  fireEvent.change(screen.getByLabelText('CSV de recebimentos'), { target: { files: [file] } })
  fireEvent.click(await screen.findByText('Validar no banco'))
}
it('exige validação e conferência antes de importar; repetição fica a cargo da referência no banco', async () => {
  rpc.mockResolvedValueOnce({ data: { new_rows: 1, duplicates: 0 }, error: null })
    .mockResolvedValueOnce({ data: { new_rows: 1, duplicates: 0 }, error: null })
  await openFile()
  await screen.findByText('Novos: 1. Referências já importadas: 0.')
  expect(rpc).toHaveBeenCalledWith('import_income_statement', expect.objectContaining({ p_wallet: 'qa-wallet', p_commit: false }))
  const confirm = screen.getByText('Confirmar importação')
  expect(confirm).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(confirm)
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('import_income_statement', expect.objectContaining({ p_commit: true })))
  expect(await screen.findByText('1 créditos importados; 0 já registrados.')).toBeInTheDocument()
})
it('não promete ausência de gravação quando a confirmação perde a resposta da rede', async () => {
  rpc.mockResolvedValueOnce({ data: { new_rows: 1, duplicates: 0 }, error: null })
    .mockRejectedValueOnce(new Error('Network interrupted'))
  await openFile()
  await screen.findByText('Novos: 1. Referências já importadas: 0.')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByText('Confirmar importação'))
  expect(await screen.findByText(/Não foi possível confirmar o resultado/)).toBeInTheDocument()
  expect(screen.queryByText(/nada deste lote foi salvo/)).not.toBeInTheDocument()
  expect(screen.queryByText('Confirmar importação')).not.toBeInTheDocument()
})
it('não permite confirmar um lote já inteiramente importado', async () => {
  rpc.mockResolvedValueOnce({ data: { new_rows: 0, duplicates: 1 }, error: null })
  await openFile()
  await screen.findByText('Novos: 0. Referências já importadas: 1.')
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByText('Confirmar importação')).toBeDisabled()
  expect(rpc).toHaveBeenCalledTimes(1)
})
