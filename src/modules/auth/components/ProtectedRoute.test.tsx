import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore } from '../store'

afterEach(() => useAuthStore.setState({ session: null, user: null, loading: true }))

function open(path: string, loading = false) {
  useAuthStore.setState({ session: null, user: null, loading })
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<p>Login público</p>} />
    <Route element={<ProtectedRoute />}>
      <Route path="/inicio" element={<p>Dados privados</p>} />
      <Route path="/analise/score" element={<p>Dados privados</p>} />
    </Route>
    <Route path="*" element={<p>Endereço inexistente</p>} />
  </Routes></MemoryRouter>)
}

it.each(['/inicio', '/analise/score'])('redireciona %s sem sessão para login, sem exibir dados ou 404', path => {
  open(path)
  expect(screen.getByText('Login público')).toBeInTheDocument()
  expect(screen.queryByText('Dados privados')).not.toBeInTheDocument()
  expect(screen.queryByText('Endereço inexistente')).not.toBeInTheDocument()
})

it('não confunde endereço desconhecido com rota protegida', () => {
  open('/dashboard-inexistente')
  expect(screen.getByText('Endereço inexistente')).toBeInTheDocument()
  expect(screen.queryByText('Dados privados')).not.toBeInTheDocument()
})

it('aguarda a restauração da sessão antes de decidir o redirecionamento', () => {
  open('/inicio', true)
  expect(screen.getByText('Carregando...')).toBeInTheDocument()
  expect(screen.queryByText('Login público')).not.toBeInTheDocument()
  expect(screen.queryByText('Dados privados')).not.toBeInTheDocument()
})
