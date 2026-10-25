import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '../../../routes'

vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => { throw new Error('Página pública não deve exigir sessão') } }))

it.each([
  ['/sobre', 'Conheça o Valora'], ['/privacidade', 'Política de Privacidade'], ['/termos', 'Termos de Uso'],
])('abre %s diretamente sem autenticação', (path, title) => {
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>)
  expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Contato' })).toHaveAttribute('href', 'mailto:valorainvestbr@gmail.com')
})

it('liga apresentação, privacidade e termos sem redirecionar ao login', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/sobre']}><AppRoutes /></MemoryRouter>)
  await user.click(screen.getByRole('link', { name: 'Política de Privacidade' }))
  expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Termos de Uso' }))
  expect(screen.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument()
})
