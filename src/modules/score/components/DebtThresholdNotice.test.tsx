import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { DebtThresholdNotice } from './DebtThresholdNotice'

it('explica o limite armazenado sem tratar 1,5 como múltiplo nem converter a regra', () => {
  render(<DebtThresholdNotice minimum={1.5} />)
  expect(screen.getByText(/1,5% \(0,015 vez o patrimônio\)/)).toBeInTheDocument()
  expect(screen.getByText(/Nenhum limite foi convertido automaticamente/)).toBeInTheDocument()
})
it('explica intervalo percentual e não modifica seus extremos', () => {
  render(<DebtThresholdNotice minimum={50} maximum={150} />)
  expect(screen.getByText(/50% e 150%/)).toBeInTheDocument()
})
it('não mostra interpretação de valor não finito', () => {
  const { container } = render(<DebtThresholdNotice minimum={NaN} />)
  expect(container).toBeEmptyDOMElement()
})
