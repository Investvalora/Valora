import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { EditTransactionButton } from './EditTransactionButton'
import type { Transaction } from '../services/transactionsService'

const edit = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }))
vi.mock('../hooks/useTransactions', () => ({ useEditTransaction: () => edit }))
vi.mock('../../assets/hooks/useAssetDetail', () => ({ useAssetDetail: () => ({ data: { currency: 'USD' } }) }))
const transaction: Transaction = { id: 'tx',seq: 1,user_id: 'owner',wallet_id: 'w',ticker: 'AAPL',type: 'buy',quantity: 0.0661,price: 302.6,brokerage_fee: 1,tax: 2,transaction_date: '2026-01-05',created_at: '' }
beforeEach(() => { edit.mutateAsync.mockReset().mockResolvedValue({}); edit.isPending = false })
async function open() {
  const user = userEvent.setup()
  render(<EditTransactionButton transaction={transaction} />)
  await user.click(screen.getByRole('button', { name: /Editar lançamento/ }))
  return user
}

it('preenche moeda/dados exatos e salva alteração mantendo identidade e snapshot original', async () => {
  const user = await open()
  expect(screen.getByLabelText('Quantidade')).toHaveValue('0,0661')
  expect(screen.getByLabelText('Preço unitário (USD)')).toHaveValue('302,6')
  await user.clear(screen.getByLabelText('Quantidade'))
  await user.type(screen.getByLabelText('Quantidade'), '0,07')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(edit.mutateAsync).toHaveBeenCalledWith({ original: transaction, changes: { type: 'buy',transaction_date: '2026-01-05',quantity: 0.07,price: 302.6,brokerage_fee: 1,tax: 2 } })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
it('rejeita quantidade inválida antes de enviar', async () => {
  const user = await open()
  await user.clear(screen.getByLabelText('Quantidade'))
  await user.type(screen.getByLabelText('Quantidade'), '0')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(screen.getByRole('alert')).toHaveTextContent('quantidade positiva')
  expect(edit.mutateAsync).not.toHaveBeenCalled()
})
it('rejeita data futura antes de enviar', async () => {
  const user = await open()
  fireEvent.change(screen.getByLabelText('Data da transação'), { target: { value: '2999-01-01' } })
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(screen.getByRole('alert')).toHaveTextContent('até hoje')
  expect(edit.mutateAsync).not.toHaveBeenCalled()
})
it('mantém os dados quando o servidor rejeita a ordem histórica', async () => {
  edit.mutateAsync.mockRejectedValueOnce({ code: '23514', message: 'internal detail' })
  const user = await open()
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('venda sem saldo')
  expect(screen.getByLabelText('Quantidade')).toHaveValue('0,0661')
  expect(screen.queryByText(/internal detail/)).not.toBeInTheDocument()
})
it('bloqueia reenvio com snapshot desatualizado e permite cancelar', async () => {
  edit.mutateAsync.mockRejectedValueOnce({ code: '40001' })
  const user = await open()
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Feche e atualize a lista')
  expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('não oferece edição de provento ou bonificação', () => {
  render(<EditTransactionButton transaction={{ ...transaction,type: 'dividend' }} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('preserva frações pequenas sem notação científica nem arredondamento', async () => {
  const user = userEvent.setup()
  const tiny = { ...transaction,quantity: 0.00000001 }
  render(<EditTransactionButton transaction={tiny} />)
  await user.click(screen.getByRole('button', { name: /Editar lançamento/ }))
  expect(screen.getByLabelText('Quantidade')).toHaveValue('0,00000001')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(edit.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ changes: expect.objectContaining({ quantity: 0.00000001,price: 302.6 }) }))
})
it('não arredonda silenciosamente valores monetários além da precisão do banco', async () => {
  const user = await open()
  await user.clear(screen.getByLabelText('Preço unitário (USD)'))
  await user.type(screen.getByLabelText('Preço unitário (USD)'), '10,12345')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(screen.getByRole('alert')).toHaveTextContent('até 4 casas decimais')
  expect(edit.mutateAsync).not.toHaveBeenCalled()
})
