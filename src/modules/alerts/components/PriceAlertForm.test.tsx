import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { PriceAlertForm } from './PriceAlertForm'

const create = vi.hoisted(() => vi.fn())
vi.mock('../../portfolio/hooks/useAssetSearch', () => ({ useAssetSearch: () => ({ data: [] }) }))
vi.mock('../services/alertQuoteService', () => ({ alertQuoteService: { resolveAsset: async () => null } }))
vi.mock('../hooks/useAlertMutations', () => ({
  useCreatePriceTargetAlert: () => ({ mutateAsync: create, isPending: false }),
}))
beforeEach(() => create.mockReset().mockResolvedValue({}))

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
