import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { InvestmentCalculators } from './InvestmentCalculators'

it('calcula juros e invalida o resultado ao mudar premissas', async () => {
  const user = userEvent.setup()
  render(<InvestmentCalculators onUseYield={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Calcular simulação' }))
  expect(screen.getByText('Juros acumulados')).toBeInTheDocument()
  await user.clear(screen.getByLabelText('Aporte mensal (R$)'))
  expect(screen.queryByText('Juros acumulados')).not.toBeInTheDocument()
})
it('abre a criação de estratégia apenas após calcular o DY do preço-teto', async () => {
  const user = userEvent.setup()
  const onUseYield = vi.fn()
  render(<InvestmentCalculators onUseYield={onUseYield} />)
  await user.click(screen.getByRole('button', { name: 'Preço-teto de FII' }))
  expect(screen.queryByRole('button', { name: 'Exibir preço-teto de FIIs em Ativos' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Calcular simulação' }))
  expect(screen.getByText('Preço-teto por cota')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Exibir preço-teto de FIIs em Ativos' }))
  expect(onUseYield).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({ method: 'fii', fii_treasury: 0.083, fii_tax: 0.15, fii_premium: 0.01 }))
  expect(onUseYield.mock.calls[0][1].fii_inflation).toBeCloseTo(0.0439)
  expect(onUseYield.mock.calls[0][0]).toBeCloseTo(0.12207176645)
})
