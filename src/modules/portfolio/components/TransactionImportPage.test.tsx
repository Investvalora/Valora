import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TransactionImportPage } from './TransactionImportPage'

const mocks = vi.hoisted(() => ({ validate: vi.fn(), import: vi.fn(), walletId: 'test-wallet', history: [] as unknown[], refetch: vi.fn() }))
vi.mock('../services/transactionsService', () => ({ transactionsService: { validateTickers: mocks.validate } }))
vi.mock('../hooks/useImportTransactions', () => ({ useImportTransactions: () => ({ mutateAsync: mocks.import, isPending: false }) }))
vi.mock('../hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: mocks.walletId, name: 'Teste' } }) }))
vi.mock('../hooks/useTransactions', () => ({ useAllTransactions: () => ({ data: mocks.history, isPending: false, isError: false, refetch: mocks.refetch }) }))
beforeEach(() => {
  mocks.validate.mockReset().mockImplementation(async rows => rows)
  mocks.import.mockReset().mockResolvedValue(1)
  mocks.walletId = 'test-wallet'
  mocks.history = []
})
async function openPreview() {
  const view = render(<MemoryRouter><TransactionImportPage /></MemoryRouter>)
  const bytes = new TextEncoder().encode('data;ticker;tipo;quantidade;preço;corretagem\n2026-01-05;PETR4;buy;1;30;0')
  fireEvent.change(screen.getByLabelText('Arquivo CSV'), { target: { files: [{ arrayBuffer: async () => bytes.buffer }] } })
  await screen.findByRole('button', { name: 'Confirmar importação' })
  return view
}
it('bloqueia confirmação até a validação da edição terminar', async () => {
  await openPreview()
  let finish!: (rows: unknown) => void
  let submitted: unknown
  mocks.validate.mockImplementation(rows => { submitted = rows; return new Promise(resolve => { finish = resolve }) })
  fireEvent.change(screen.getByLabelText('ticker linha 2'), { target: { value: 'VALE3' } })
  expect(screen.getByRole('button', { name: 'Validando...' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Validando...' }))
  expect(mocks.import).not.toHaveBeenCalled()
  await act(async () => finish(submitted))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }))
  await waitFor(() => expect(mocks.import).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ ticker: 'VALE3' })])))
})
it('falha de validação não deixa confirmar linhas ainda não verificadas', async () => {
  await openPreview()
  mocks.validate.mockRejectedValue(new Error('offline'))
  fireEvent.change(screen.getByLabelText('ticker linha 2'), { target: { value: 'VALE3' } })
  await screen.findByRole('alert')
  expect(screen.getByRole('button', { name: 'Confirmar importação' })).toBeDisabled()
  expect(mocks.import).not.toHaveBeenCalled()
})
it('exige conferir coincidência, mas permite uma compra igual legítima', async () => {
  mocks.history = [{ transaction_date: '2026-01-05', ticker: 'PETR4', type: 'buy', quantity: 1, price: 30, brokerage_fee: 0 }]
  await openPreview()
  expect(screen.getByRole('button', { name: 'Confirmar importação' })).toBeDisabled()
  fireEvent.click(screen.getByLabelText(/Conferi as 1 linhas/))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar importação' }))
  await waitFor(() => expect(mocks.import).toHaveBeenCalledOnce())
})
it('troca de carteira exige selecionar o arquivo novamente', async () => {
  const view = await openPreview()
  mocks.walletId = 'other-wallet'
  view.rerender(<MemoryRouter><TransactionImportPage /></MemoryRouter>)
  expect(screen.getByRole('alert')).toHaveTextContent('A carteira mudou')
  expect(screen.getByRole('button', { name: 'Confirmar importação' })).toBeDisabled()
})
