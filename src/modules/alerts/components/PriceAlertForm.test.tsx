import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { PriceAlertForm } from './PriceAlertForm'

const create = vi.hoisted(() => vi.fn())
const resolveAsset = vi.hoisted(() => vi.fn(async () => null))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u' } }) }))
vi.mock('../../portfolio/hooks/useAssetSearch', () => ({ useAssetSearch: () => ({ data: [] }) }))
vi.mock('../services/alertQuoteService', () => ({ alertQuoteService: { resolveAsset } }))
vi.mock('../hooks/useAlertMutations', () => ({
  useCreatePriceTargetAlert: () => ({ mutateAsync: create, isPending: false }),
}))
beforeEach(() => { sessionStorage.clear(); create.mockReset().mockResolvedValue({}); resolveAsset.mockClear() })

it.each([
  ['23505', /Já existe um alerta ativo/],
  ['23503', /Ativo não encontrado no catálogo/],
  ['unexpected', /Erro ao criar alerta. Tente novamente/],
])('explica a falha %s e permite tentar novamente sem perder os campos', async (code, message) => {
  const user = userEvent.setup()
  const close = vi.fn()
  create.mockRejectedValueOnce({ code, message: 'detalhe interno que não deve aparecer' })
  render(<PriceAlertForm onClose={close} initialTicker="MXRF11" />)
  await user.type(screen.getByLabelText('Preço-alvo (R$)'), '10')
  await user.click(screen.getByRole('button', { name: 'Criar alerta' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.queryByText(/detalhe interno/)).not.toBeInTheDocument()
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Ativo (ticker)')).toHaveValue('MXRF11')
  expect(screen.getByLabelText('Preço-alvo (R$)')).toHaveValue(10)
  await user.click(screen.getByRole('button', { name: 'Criar alerta' }))
  expect(create).toHaveBeenLastCalledWith({ ticker: 'MXRF11', targetPrice: 10, condition: 'below' })
  expect(close).toHaveBeenCalledOnce()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('restaura preço-alvo e condição após recarga sem criar alerta; cancelar limpa', async () => {
  const user = userEvent.setup()
  const first = render(<PriceAlertForm onClose={vi.fn()} initialTicker="MXRF11" />)
  fireEvent.change(screen.getByLabelText('Preço-alvo (R$)'), { target: { value: '9.75' } })
  await user.click(screen.getByLabelText('Acima de'))
  first.unmount()
  resolveAsset.mockClear()
  const second = render(<PriceAlertForm onClose={vi.fn()} initialTicker="MXRF11" />)
  expect(screen.getByLabelText('Preço-alvo (R$)')).toHaveValue(null)
  await user.click(screen.getByRole('button', { name: 'Restaurar rascunho' }))
  expect(screen.getByLabelText('Preço-alvo (R$)')).toHaveValue(9.75)
  expect(screen.getByLabelText('Acima de')).toBeChecked()
  expect(resolveAsset).not.toHaveBeenCalled()
  expect(create).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  second.unmount()
  render(<PriceAlertForm onClose={vi.fn()} initialTicker="MXRF11" />)
  expect(screen.queryByText('Restaurar rascunho')).not.toBeInTheDocument()
})
