import { expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FixedIncomeHistoryPanel } from './FixedIncomeHistoryPanel'
import { useAssetFilters } from '../hooks/useAssetFilters'

const save = vi.hoisted(() => vi.fn())
vi.mock('../../portfolio/hooks/useWallets', () => ({ useWallets: () => ({ selectedWallet: { id: 'w' } }) }))
vi.mock('../../portfolio/hooks/useCalcFixedIncome', () => ({ useCalcFixedIncome: () => ({ calc: vi.fn(), isLoading: false, state: 'idle' }) }))
vi.mock('../../portfolio/hooks/useFixedIncomeHistory', () => ({ useFixedIncomeHistory: () => ({ data: { positions: [{ id: 'p', name: 'CDB Teste', active: true, principal: 1000, remaining_principal: 400, application_date: '2026-08-01' }], events: [{ id: 'e', position_id: 'p', type: 'coupon', event_date: '2026-09-01', amount: 20, balance_after: 420 }] } }), useAddFixedIncomeEvent: () => ({ mutateAsync: save, isPending: false }) }))

it('registra resgate total com saldo zero e preserva o mesmo ID após falha', async () => {
  useAssetFilters.setState({ query: '', types: [] })
  save.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
  const user = userEvent.setup()
  render(<FixedIncomeHistoryPanel />)
  expect(within(screen.getByRole('table')).getByText('Cupom')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Registrar recebimento' }))
  await user.selectOptions(screen.getByLabelText('Título'), 'p')
  await user.selectOptions(screen.getByLabelText('Recebimento'), 'redemption')
  await user.type(screen.getByLabelText('Valor bruto recebido (R$)'), '420')
  await user.type(screen.getByLabelText('Principal resgatado (R$)'), '400')
  await user.type(screen.getByLabelText('Saldo bruto do título após o recebimento (R$)'), '1')
  await user.click(screen.getByRole('button', { name: 'Registrar movimento' }))
  expect(save).not.toHaveBeenCalled()
  await user.clear(screen.getByLabelText('Saldo bruto do título após o recebimento (R$)'))
  await user.type(screen.getByLabelText('Saldo bruto do título após o recebimento (R$)'), '0')
  await user.click(screen.getByRole('button', { name: 'Registrar movimento' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível registrar')
  await user.click(screen.getByRole('button', { name: 'Registrar movimento' }))
  expect(save.mock.calls[0][0]).toEqual(save.mock.calls[1][0])
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ position_id: 'p', type: 'redemption', amount: 420, principal_redeemed: 400, balance_after: 0 }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
