import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { PublicOnlyRoute } from './PublicOnlyRoute'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}))

it('mantém o fundo montado enquanto as cores mudam entre as telas de autenticação', () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<main><Link to="/cadastro">Cadastro</Link></main>} />
          <Route path="/cadastro" element={<main><Link to="/recuperar-senha">Recuperação</Link></main>} />
          <Route path="/recuperar-senha" element={<main>Senha</main>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

  const blue = container.querySelector('.auth-scene__blue')
  const scene = container.querySelector('.auth-scene')
  expect(scene).toHaveAttribute('data-auth-view', 'login')

  fireEvent.click(screen.getByRole('link', { name: 'Cadastro' }))
  expect(scene).toHaveAttribute('data-auth-view', 'signup')
  expect(container.querySelector('.auth-scene__blue')).toBe(blue)

  fireEvent.click(screen.getByRole('link', { name: 'Recuperação' }))
  expect(scene).toHaveAttribute('data-auth-view', 'recovery')
  expect(container.querySelector('.auth-scene__blue')).toBe(blue)
})
