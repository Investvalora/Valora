import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { useAuthStore } from '../store'
afterEach(() => useAuthStore.setState({ session: null, loading: true }))
function open(path: string) {
  useAuthStore.setState({ session: { access_token: 'test' } as never, loading: false })
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route element={<PublicOnlyRoute />}><Route path="login" element={<p>Formulário de login</p>} /></Route>
    <Route path="inicio" element={<p>Início</p>} />
  </Routes></MemoryRouter>)
}
it('permite login explícito para recuperar sessão sem logout global', () => {
  open('/login?reauth=1')
  expect(screen.getByText('Formulário de login')).toBeInTheDocument()
})
it('mantém redirecionamento normal de quem já possui sessão', () => {
  open('/login')
  expect(screen.getByText('Início')).toBeInTheDocument()
})
