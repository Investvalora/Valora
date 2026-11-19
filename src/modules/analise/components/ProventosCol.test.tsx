import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { MiniBarChart } from './ProventosCol'
it('mostra o valor exato de cada mês no mouse, teclado e toque', () => {
  render(<MiniBarChart months={[{ month: '2026-10', total: 12.34 }, { month: '2026-11', total: 71.4 }]} />)
  const october = screen.getByRole('button', { name: /Out\/2026: R\$\s*12,34/ })
  fireEvent.mouseEnter(october)
  expect(screen.getByRole('status')).toHaveTextContent(/Out\/2026: R\$\s*12,34/)
  fireEvent.focus(screen.getByRole('button', { name: /Nov\/2026/ }))
  expect(screen.getByRole('status')).toHaveTextContent(/Nov\/2026: R\$\s*71,40/)
  fireEvent.keyDown(screen.getByRole('button', { name: /Nov\/2026/ }), { key: 'Escape' })
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  fireEvent.click(october)
  expect(screen.getByRole('status')).toHaveTextContent(/12,34/)
})
